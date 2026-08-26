"use strict";

/*
 * HISTÓRICO ATUAL COMPARTILHADO — FIREBASE REALTIME DATABASE
 *
 * O backup continua LOCAL e serve somente como base de aprendizado.
 * Apenas resultados com fonte "ao-vivo" são compartilhados.
 *
 * Esta versão evita sobrescrever a lista inteira do Firebase: cada partida
 * fica em seu próprio nó, identificado por data + horário.
 *
 * Banco configurado:
 * https://projeto-padroes-default-rtdb.firebaseio.com
 */
const Sincronizacao = {
  DATABASE_URL: "https://projeto-padroes-default-rtdb.firebaseio.com",
  CAMINHO: "historico_compartilhado",
  INTERVALO_MS: 2000,
  _timer: null,
  _rodando: false,
  _ultimoHash: "",
  _listeners: new Set(),
  _chavesConhecidasAoAbrir: new Set(),
  _chavesEntreguesSessao: new Set(),
  _inicioSessaoMs: 0,
  _baselineRemotoPronto: false,

  configurada() {
    return /^https:\/\/[^\s]+$/.test(String(this.DATABASE_URL || "").trim());
  },

  _baseUrl() {
    return String(this.DATABASE_URL || "").replace(/\/$/, "");
  },

  _url() {
    return `${this._baseUrl()}/${this.CAMINHO}.json`;
  },

  _chave(r) {
    const t = r?._temporal;
    return t?.data && t?.horario ? `${t.data}|${t.horario}` : null;
  },

  // Chave segura para o Firebase. Ex.: 2026-08-26|04:24 -> 2026-08-26_04-24
  _idFirebase(r) {
    const chave = this._chave(r);
    if (!chave) return null;
    return chave.replace(/\|/g, "_").replace(/:/g, "-").replace(/[.#$\[\]\/]/g, "_");
  },

  _urlRegistro(r) {
    const id = this._idFirebase(r);
    if (!id) return null;
    return `${this._baseUrl()}/${this.CAMINHO}/${encodeURIComponent(id)}.json`;
  },

  _normalizar(r) {
    if (!r?.placar || !r?._temporal?.data || !r?._temporal?.horario) return null;
    const [casa, fora] = String(r.placar).split("x").map(Number);
    if (!Number.isFinite(casa) || !Number.isFinite(fora)) return null;

    return {
      id: this._idFirebase(r),
      placar: `${casa}x${fora}`,
      golsCasa: casa,
      golsFora: fora,
      totalGols: casa + fora,
      // Nunca inventa uma data ao ler um registro antigo. Se um registro remoto
      // antigo não tiver timestamp, ele deve ser tratado como histórico anterior,
      // não como algo criado agora.
      data: (typeof r.data === "string" && r.data) ? r.data : null,
      _temporal: {
        data: r._temporal.data,
        horario: r._temporal.horario,
        hora: r._temporal.hora,
        minuto: r._temporal.minuto,
        slot3: r._temporal.slot3,
        timeZone: r._temporal.timeZone || "Europe/London"
      },
      fonte: "ao-vivo"
    };
  },

  _listaUnica(lista) {
    const mapa = new Map();
    for (const bruto of (lista || [])) {
      const r = this._normalizar(bruto);
      const chave = this._chave(r);
      if (r && chave && !mapa.has(chave)) mapa.set(chave, r);
    }
    return [...mapa.values()].sort((a, b) => this._chave(a).localeCompare(this._chave(b)));
  },

  _hash(lista) {
    return JSON.stringify(this._listaUnica(lista).map(r => [this._chave(r), r.placar]));
  },

  _foiCriadoNestaSessao(r) {
    const ms = Date.parse(r?.data || "");
    return Number.isFinite(ms) && this._inicioSessaoMs > 0 && ms >= this._inicioSessaoMs;
  },

  _somenteNovosDaSessao(lista) {
    return this._listaUnica(lista).filter(r => {
      const chave = this._chave(r);
      return chave && !this._chavesConhecidasAoAbrir.has(chave) && this._foiCriadoNestaSessao(r);
    });
  },

  async _get() {
    if (!this.configurada()) return [];
    const res = await fetch(this._url(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Banco remoto HTTP ${res.status}`);
    const dados = await res.json();
    if (!dados) return [];
    return Array.isArray(dados) ? dados : Object.values(dados);
  },

  // Grava apenas UMA partida. Assim um usuário não apaga resultados enviados
  // simultaneamente por outros usuários.
  async _putRegistro(r) {
    const url = this._urlRegistro(r);
    if (!url) return false;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r)
    });
    if (!res.ok) throw new Error(`Banco remoto HTTP ${res.status}`);
    return true;
  },

  /* Extrai somente resultados ao-vivo do armazenamento local. */
  extrairLocais() {
    const dados = typeof Armazenamento !== "undefined" ? Armazenamento.obterDados() : [];
    return (dados || [])
      .filter(x => x && typeof x === "object" && x.fonte === "ao-vivo")
      .map(x => this._normalizar(x))
      .filter(Boolean);
  },

  async sincronizarAgora() {
    if (!this.configurada() || this._rodando) return;
    this._rodando = true;

    try {
      // 1) Lê o que já existe no histórico compartilhado.
      const remotoAntes = this._listaUnica(await this._get());

      // Se a primeira leitura do Firebase falhou na abertura, a primeira leitura
      // que funcionar depois vira a linha de base. Registros realmente criados
      // depois da abertura continuam elegíveis; registros antigos não entram como
      // placares fantasmas na sessão atual.
      if (!this._baselineRemotoPronto) {
        for (const r of remotoAntes) {
          if (!this._foiCriadoNestaSessao(r)) {
            const chave = this._chave(r);
            if (chave) this._chavesConhecidasAoAbrir.add(chave);
          }
        }
        this._baselineRemotoPronto = true;
      }

      const locais = this._somenteNovosDaSessao(this.extrairLocais());
      const mapaRemoto = new Map(remotoAntes.map(r => [this._chave(r), r]));

      // 2) Envia somente partidas locais que ainda não existem no Firebase.
      // Cada uma é gravada em seu próprio nó, sem substituir a coleção inteira.
      for (const local of locais) {
        const chave = this._chave(local);
        if (!mapaRemoto.has(chave)) {
          await this._putRegistro(local);
          mapaRemoto.set(chave, local);
        }
      }

      // 3) Recarrega após possíveis envios para distribuir o estado comum
      // a todos os dispositivos.
      const remotoDepois = this._listaUnica(await this._get());
      const novosRemotos = this._somenteNovosDaSessao(remotoDepois);
      const combinado = this._listaUnica([...novosRemotos, ...locais]);
      const novosParaInterface = combinado.filter(r => {
        const chave = this._chave(r);
        return chave && !this._chavesEntreguesSessao.has(chave);
      });

      if (novosParaInterface.length) {
        for (const r of novosParaInterface) this._chavesEntreguesSessao.add(this._chave(r));
        for (const fn of this._listeners) {
          try { fn(novosParaInterface); } catch (e) { console.error(e); }
        }
      }
    } catch (e) {
      console.warn("Sincronização compartilhada indisponível:", e);
    } finally {
      this._rodando = false;
    }
  },

  observar(fn) {
    if (typeof fn === "function") this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },

  async iniciar() {
    if (!this.configurada() || this._timer) return false;

    // A sessão nasce ANTES de qualquer acesso à rede. Assim, mesmo que o
    // Firebase falhe por alguns segundos na abertura, resultados locais antigos
    // nunca podem ser confundidos com resultados recém-registrados.
    this._inicioSessaoMs = Date.now();
    const locaisExistentes = this._listaUnica(this.extrairLocais());
    this._chavesConhecidasAoAbrir = new Set(
      locaisExistentes.map(r => this._chave(r)).filter(Boolean)
    );
    this._chavesEntreguesSessao = new Set();
    this._baselineRemotoPronto = false;

    try {
      // Tudo que já existia no Firebase no instante da abertura vira apenas
      // linha de base e não entra na nova sessão visual.
      const existentes = this._listaUnica(await this._get());
      for (const r of existentes) {
        const chave = this._chave(r);
        if (chave) this._chavesConhecidasAoAbrir.add(chave);
      }
      this._ultimoHash = this._hash(existentes);
      this._baselineRemotoPronto = true;
    } catch (e) {
      console.warn("Não foi possível preparar o histórico da sessão:", e);
    }

    this._timer = setInterval(() => this.sincronizarAgora(), this.INTERVALO_MS);
    return true;
  },

  parar() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
};

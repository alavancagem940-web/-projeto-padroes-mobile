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
      data: r.data || new Date().toISOString(),
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
      const locais = this._listaUnica(this.extrairLocais());
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
      const combinado = this._listaUnica([...remotoDepois, ...locais]);
      const hash = this._hash(combinado);

      if (hash !== this._ultimoHash) {
        this._ultimoHash = hash;
        for (const fn of this._listeners) {
          try { fn(combinado); } catch (e) { console.error(e); }
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
    await this.sincronizarAgora();
    this._timer = setInterval(() => this.sincronizarAgora(), this.INTERVALO_MS);
    return true;
  },

  parar() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
};

"use strict";

const GreenRed = {
  _cache: { assinatura: null, avaliacoes: new Map() },

  _assinatura(r) {
    return r.map(x => `${x.id || ""}:${x.placar || ""}`).join("|");
  },

  _prepararCache(r) {
    const assinatura = this._assinatura(r);

    if (this._cache.assinatura !== assinatura) {
      const anteriorAssinatura = this._cache.assinatura || "";

      const somenteAppend =
        anteriorAssinatura &&
        assinatura.startsWith(anteriorAssinatura) &&
        (
          assinatura.length === anteriorAssinatura.length ||
          assinatura.charAt(anteriorAssinatura.length) === "|"
        );

      if (!somenteAppend) {
        this._cache.avaliacoes.clear();
      }

      this._cache.assinatura = assinatura;
    }
  },

  _inicioContagem(r) {
    // O histórico/backup inteiro é somente BASE DE ESTUDO.
    // Os indicadores GREEN/RED da sessão atual começam zerados.
    // Os 3 primeiros resultados novos servem apenas para formar o contexto.
    // A primeira previsão é feita para o 4º resultado novo; portanto,
    // a primeira avaliação possível é o índice base + 3.
    const base = Number(Historico?.obterQuantidadeBaseEstudo?.() ?? 0);
    if (!Number.isFinite(base) || base < 0) return 1;
    return Math.min(r.length, base + 3);
  },

  avaliarPalpiteRegistrado(alvo, registro) {
    if (!alvo || !registro?.palpites) return null;
    const p = registro.palpites;
    const res = { previsoes: {} };
    const ativo = k => p[k] && p[k].valor != null;

    if (ativo("exato")) {
      res.exato = p.exato.valor === alvo.placar;
      res.previsoes.exato = p.exato.valor;
    }
    if (ativo("gols")) {
      const previsto = Number(p.gols.valor);
      res.gols = previsto === 5 ? alvo.totalGols >= 5 : previsto === alvo.totalGols;
      res.previsoes.gols = p.gols.valor;
    }
    if (ativo("r12")) {
      const v = p.r12.valor;
      res.r12 = (v === "1" && alvo.golsCasa > alvo.golsFora) ||
        (v === "X" && alvo.golsCasa === alvo.golsFora) ||
        (v === "2" && alvo.golsCasa < alvo.golsFora);
      res.previsoes.r12 = typeof MercadoResultado1X2 !== "undefined" ? MercadoResultado1X2.rotulo(v) : v;
    }
    if (ativo("bm")) {
      const v = p.bm.valor === "SIM";
      res.bm = v === (alvo.golsCasa > 0 && alvo.golsFora > 0);
      res.previsoes.bm = p.bm.valor;
    }
    for (const [k, linha] of [["ou05",0.5],["ou15",1.5],["ou25",2.5],["ou35",3.5],["over35",3.5]]) {
      if (!ativo(k)) continue;
      const v = p[k].valor;
      res[k] = v === "MAIS" ? alvo.totalGols > linha : alvo.totalGols < linha;
      res.previsoes[k] = v === "MAIS" ? `Mais de ${linha}` : `Menos de ${linha}`;
    }
    return res;
  },

  avaliarPrevisao(resultados, indice) {
    if (!Array.isArray(resultados) || indice <= 0 || indice >= resultados.length) {
      return null;
    }

    const alvo = resultados[indice];
    const m = Previsoes.gerar(resultados.slice(0, indice)).mercados;

    const ativo = k => m[k]?.ativo && m[k]?.palpite;
    const res = { previsoes: {} };

    if (ativo("exato")) {
      res.exato = m.exato.palpite.valor === alvo.placar;
      res.previsoes.exato = m.exato.palpite.valor;
    }

    if (ativo("gols")) {
      // O valor 5 do mercado de quantidade de gols representa
      // "5 ou mais gols", e NÃO "exatamente 5 gols".
      // Portanto, 5, 6, 7, 8... devem ser GREEN quando a previsão é 5+.
      const previstoGols = Number(m.gols.palpite.valor);
      res.gols = previstoGols === 5
        ? alvo.totalGols >= 5
        : previstoGols === alvo.totalGols;
      res.previsoes.gols = m.gols.palpite.valor;
    }

    if (ativo("r12")) {
      const v = m.r12.palpite.valor;
      res.r12 =
        (v === "1" && alvo.golsCasa > alvo.golsFora) ||
        (v === "X" && alvo.golsCasa === alvo.golsFora) ||
        (v === "2" && alvo.golsCasa < alvo.golsFora);
      res.previsoes.r12 = MercadoResultado1X2.rotulo(v);
    }

    if (ativo("bm")) {
      const v = m.bm.palpite.valor === "SIM";
      res.bm = v === (alvo.golsCasa > 0 && alvo.golsFora > 0);
      res.previsoes.bm = m.bm.palpite.valor;
    }

    for (const [k, linha] of [
      ["ou05", 0.5],
      ["ou15", 1.5],
      ["ou25", 2.5],
      ["ou35", 3.5],
      ["over35", 3.5]
    ]) {
      if (ativo(k)) {
        const v = m[k].palpite.valor;
        res[k] = v === "MAIS"
          ? alvo.totalGols > linha
          : alvo.totalGols < linha;
        res.previsoes[k] = v === "MAIS"
          ? `Mais de ${linha}`
          : `Menos de ${linha}`;
      }
    }

    return res;
  },

  _avaliacaoCache(r, indice) {
    this._prepararCache(r);

    if (!this._cache.avaliacoes.has(indice)) {
      this._cache.avaliacoes.set(indice, this.avaliarPrevisao(r, indice));
    }

    return this._cache.avaliacoes.get(indice);
  },

  resumo(r) {
    const chaves = [
      "exato", "ou05", "ou15", "ou25",
      "ou35", "over35", "bm", "r12", "gols"
    ];

    const vazio = () => ({
      atual: 0,
      tipo: null,
      greens: 0,
      reds: 0,
      totalGreens: 0,
      totalReds: 0,
      historico: []
    });

    if (!Array.isArray(r) || r.length < 2) {
      this._prepararCache(Array.isArray(r) ? r : []);
      return {
        anterior: null,
        sequencias: Object.fromEntries(chaves.map(k => [k, vazio()]))
      };
    }

    this._prepararCache(r);

    const historicos = Object.fromEntries(chaves.map(k => [k, []]));
    const inicio = this._inicioContagem(r);
    let anterior = null;

    for (let i = inicio; i < r.length; i++) {
      if (i <= 0) continue;

      let avaliacao = null;
      const alvo = r[i];
      const registrado = (typeof PalpitesRegistrados !== "undefined" && alvo?._temporal)
        ? PalpitesRegistrados.obterParaPartida(alvo._temporal)
        : null;
      avaliacao = registrado
        ? this.avaliarPalpiteRegistrado(alvo, registrado)
        : this._avaliacaoCache(r, i);

      if (i === r.length - 1) {
        anterior = avaliacao;
      }

      if (!avaliacao) continue;

      for (const k of chaves) {
        if (typeof avaliacao[k] === "boolean") {
          historicos[k].push(avaliacao[k] ? "GREEN" : "RED");
        }
      }
    }

    if (r.length <= inicio) {
      anterior = null;
    }

    const sequencias = {};

    for (const k of chaves) {
      const h = historicos[k];
      const tipo = h.at(-1) || null;

      let atual = 0;
      for (let i = h.length - 1; i >= 0 && h[i] === tipo; i--) {
        atual++;
      }

      const totalGreens = h.filter(x => x === "GREEN").length;
      const totalReds = h.filter(x => x === "RED").length;

      sequencias[k] = {
        atual,
        tipo,
        greens: tipo === "GREEN" ? atual : 0,
        reds: tipo === "RED" ? atual : 0,
        totalGreens,
        totalReds,
        historico: h
      };
    }

    return { anterior, sequencias, inicioContagem: inicio };
  },

  anterior(r) {
    return this.resumo(r).anterior;
  },

  obterSequenciaMercado(r, k) {
    return this.resumo(r).sequencias[k] || {
      atual: 0, tipo: null, greens: 0, reds: 0, historico: []
    };
  },

  obterSequenciasMercados(r) {
    return this.resumo(r).sequencias;
  },

  obterSequencia(r) {
    const s = this.obterSequenciaMercado(r, "exato");
    return {
      atual: s.atual,
      tipo: s.tipo,
      greensConsecutivos: s.greens,
      redsConsecutivos: s.reds,
      historico: s.historico
    };
  }
};

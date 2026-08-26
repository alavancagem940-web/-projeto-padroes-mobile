"use strict";

/*
 * OVER 3.5 — motor independente e mais seletivo.
 *
 * Objetivo: aumentar a quantidade de chamadas sem transformar o O3.5 em
 * simples complemento do U3.5. O Under 3.5 não é consultado aqui.
 *
 * O motor usa duas portas independentes:
 *  1) Ensemble de contexto: último total exato + últimas 2 e 3 faixas;
 *  2) Pressão de gols: os 3 últimos jogos tiveram 4+ gols.
 *
 * O4.5/O5.5 continuam como profundidade, mas MENOS em 4.5/5.5 não derruba
 * o O3.5: 4 gols continuam sendo GREEN no O3.5.
 */
const MercadoOver35 = {
  nome: 'Over 3.5 (motor independente)',
  MIN_OCORRENCIAS: 2,
  LIMIAR_ENSEMBLE: 0.42,

  transformar(r) {
    const g = Number(r?.totalGols);
    return Number.isFinite(g) && g >= 4 ? 'MAIS' : 'MENOS';
  },

  rotulo(v) {
    return v === 'MAIS' ? 'Mais de 3.5' : 'Menos de 3.5';
  },

  _faixa(total) {
    const g = Number(total);
    if (!Number.isFinite(g)) return 'NA';
    if (g === 0) return 'ZERO';
    if (g <= 2) return 'BAIXO';
    if (g <= 3) return 'MEDIO';
    if (g === 4) return 'ALTO';
    return 'MUITO_ALTO';
  },

  _ocorrencias(serie, contexto) {
    return Padroes.encontrarOcorrencias(serie, contexto);
  },

  _taxaParaContexto(serie, contexto) {
    if (!Array.isArray(contexto) || contexto.length < 1) return null;
    const ocorrencias = this._ocorrencias(serie, contexto);
    if (ocorrencias.length < this.MIN_OCORRENCIAS) return null;
    const mais = ocorrencias.filter(x => x.proximo === 'MAIS' || x.proximo === 'ALTO' || x.proximo === 'MUITO_ALTO' || (Number.isFinite(Number(x.proximo)) && Number(x.proximo) >= 4)).length;
    return {
      taxa: mais / ocorrencias.length,
      mais,
      menos: ocorrencias.length - mais,
      ocorrencias,
      tamanho: contexto.length,
      contexto: [...contexto]
    };
  },

  /*
   * Ensemble que foi testado no histórico:
   *  - último total exato: peso 2
   *  - últimas 2 faixas: peso 3
   *  - últimas 3 faixas: peso 4
   *
   * A ideia é não depender de uma única sequência muito específica.
   */
  _ensemble(serie, contextoAtual) {
    const candidatos = [];
    const contexto = contextoAtual.map(r => Number(r.totalGols));
    const serieTotais = serie.map(r => Number(r.totalGols));
    const serieFaixas = serieTotais.map(g => this._faixa(g));
    const atualFaixas = contexto.map(g => this._faixa(g));

    if (contexto.length >= 1) {
      const x = this._taxaParaContexto(serieTotais, [contexto[contexto.length - 1]]);
      if (x) candidatos.push({ ...x, peso: 2, tipo: 'último total' });
    }
    if (contexto.length >= 2) {
      const x = this._taxaParaContexto(serieFaixas, atualFaixas.slice(-2));
      if (x) candidatos.push({ ...x, peso: 3, tipo: 'últimas 2 faixas' });
    }
    if (contexto.length >= 3) {
      const x = this._taxaParaContexto(serieFaixas, atualFaixas.slice(-3));
      if (x) candidatos.push({ ...x, peso: 4, tipo: 'últimas 3 faixas' });
    }

    if (!candidatos.length) return null;

    const pesoTotal = candidatos.reduce((s, x) => s + x.peso, 0);
    const taxa = candidatos.reduce((s, x) => s + x.taxa * x.peso, 0) / pesoTotal;

    return {
      taxa,
      candidatos,
      melhor: [...candidatos].sort((a, b) =>
        b.taxa - a.taxa || b.ocorrencias.length - a.ocorrencias.length || b.tamanho - a.tamanho
      )[0]
    };
  },

  _pressaoAlta(contextoAtual) {
    if (!Array.isArray(contextoAtual) || contextoAtual.length < 3) return false;
    const ultimos = contextoAtual.slice(-3).map(r => Number(r.totalGols));
    return ultimos.length === 3 && ultimos.every(g => Number.isFinite(g) && g >= 4);
  },

  _auxiliares(resultados, contextoAtual) {
    const gols = MercadoGolsExatos.analisar(resultados, contextoAtual);
    const ocultos = gols.indicadoresOcultos || {};
    const o25 = MercadoOverUnder25.analisar(resultados, contextoAtual);
    const bm = MercadoAmbosMarcam.analisar(resultados, contextoAtual);
    return {
      o25: o25?.palpite?.valor || null,
      btts: bm?.palpite?.valor || null,
      o45: ocultos.ou45?.palpite?.valor || null,
      o55: ocultos.ou55?.palpite?.valor || null,
      golsTop: gols?.palpite?.valor ?? null
    };
  },

  analisar(resultados, contextoAtual = resultados) {
    const base = Array.isArray(resultados) ? resultados : [];
    const atual = Array.isArray(contextoAtual) && contextoAtual.length ? contextoAtual : base;

    if (base.length < 3 || atual.length < 2) {
      return {
        ativo: false,
        independente: true,
        palpite: null,
        frequenciasHistorico: Padroes.frequencias(base.map(r => this.transformar(r)), ['MAIS', 'MENOS']),
        evidencias: [],
        auxiliares: {},
        metodo: 'over35-ensemble-adaptativo-v2'
      };
    }

    const serie = base;
    const ensemble = this._ensemble(serie, atual);
    const pressaoAlta = this._pressaoAlta(atual);
    const aux = this._auxiliares(base, atual);
    const motivos = [];

    let chamado = false;
    let confianca = 0;

    if ((ensemble && ensemble.taxa>=0.40) || (ensemble && ensemble.taxa>=0.34 && aux.o25==='MAIS' && aux.btts==='SIM') || (pressaoAlta && aux.o25==='MAIS')) {
      chamado=true;
      confianca=Math.max(confianca,(ensemble?.taxa||0)*100,42);
      motivos.push('evidência combinada O3.5');
    }

    /*
     * Segunda porta: três jogos seguidos com 4+ gols.
     * No backtest walk-forward esta porta recuperou chamadas que o padrão
     * contextual perdia, inclusive sequências como 4 -> 4 -> 6.
     */
    

    // Auxiliares apenas reforçam o diagnóstico; não criam uma chamada sozinhos.
    if (chamado && aux.o25 === 'MAIS') motivos.push('O2.5 = MAIS');
    if (chamado && aux.btts === 'SIM') motivos.push('Ambos Marcam = SIM');
    if (chamado && aux.o45 === 'MAIS') motivos.push('indicador interno O4.5 = MAIS');
    if (chamado && aux.o55 === 'MAIS') motivos.push('indicador interno O5.5 = MAIS');
    if (chamado && Number(aux.golsTop) >= 4) motivos.push('Quantidade de Gols = 4+');

    const historico = Padroes.frequencias(base.map(r => this.transformar(r)), ['MAIS', 'MENOS']);
    const melhor = ensemble?.melhor || null;

    return {
      ativo: chamado,
      independente: true,
      palpite: chamado ? {
        valor: 'MAIS',
        quantidade: melhor?.mais || 0,
        percentual: Number(Math.min(95, Math.max(42, confianca)).toFixed(1))
      } : null,
      frequenciasHistorico: historico,
      evidencias: ensemble?.candidatos || [],
      evidenciaEscolhida: melhor,
      pressaoAlta,
      auxiliares: aux,
      scoreMais: chamado ? 1 : 0,
      scoreMenos: 0,
      motivos,
      metodo: 'over35-ensemble-adaptativo-v2-pressao-3-jogos'
    };
  }
};

"use strict";
const MercadoPlacarExato={
  nome:'Placar Exato',
  transformar:r=>r.placar,
  rotulo:v=>v,
  analisar(resultados,contextoAtual=resultados){
    const serie=(resultados||[]).map(this.transformar).filter(Boolean);
    const contexto=(Array.isArray(contextoAtual)&&contextoAtual.length?contextoAtual:resultados||[]).map(this.transformar).filter(Boolean);
    const p=Padroes.analisarSerie(serie,contexto,{maxContext:10,minOccurrences:2,minConfidence:18,minMargin:1.0});
    const f=Padroes.frequencias(p.amostra,[]);
    const fh=Padroes.frequencias(serie,[]);
    return {ativo:p.qualificado,padrao:p,frequencias:f,frequenciasHistorico:fh,palpite:p.qualificado?(f.lista[0]||null):null};
  }
};

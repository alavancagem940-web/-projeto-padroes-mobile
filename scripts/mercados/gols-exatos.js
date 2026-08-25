"use strict";
const MercadoGolsExatos={
  nome:'Quantidade de Gols',
  transformar(r){
    if(typeof r==='string'){
      const m=r.trim().match(/^(\d+)x(\d+)$/i); if(!m)return null;
      return String(Math.min(5,Number(m[1])+Number(m[2])));
    }
    const total=Number(r?.totalGols); if(!Number.isFinite(total)||total<0)return null;
    return String(Math.min(5,total));
  },
  rotulo(v){const n=Number(v);return n===5?'5 ou mais gols':`${n} gol${n===1?'':'s'}`;},
  _ordem(){return ['0','1','2','3','4','5'];},
  _frequencias(a){return Padroes.frequencias(a,this._ordem());},
  _serie(r){return (Array.isArray(r)?r:[]).map(x=>this.transformar(x)).filter(v=>v!==null);},
  analisar(resultados,contextoAtual=resultados){
    const serie=this._serie(resultados), atualPreferencial=this._serie(contextoAtual);
    if(serie.length<2)return {ativo:false,padrao:{encontrado:false,contexto:[],tamanho:0,ocorrencias:[],amostra:[]},frequencias:this._frequencias([]),palpite:null,metodo:'padrao-adaptativo'};
    const atual=atualPreferencial.length?atualPreferencial:serie;
    const p=Padroes.analisarSerie(serie,atual,{maxContext:10,minOccurrences:2,minConfidence:20,minMargin:1.0});
    const frequencias=this._frequencias(p.amostra);
    const frequenciasHistorico=this._frequencias(serie);
    return {ativo:p.qualificado,padrao:p,frequencias,frequenciasHistorico,palpite:p.qualificado?(frequencias.lista[0]||null):null,metodo:'padrao-adaptativo'};
  }
};

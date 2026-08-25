"use strict";
/* Camada de aprendizado: observa previsões passadas sem alterar o motor de padrões. */
const Aprendizado={
  _cache:{assinatura:null,registros:[],indice:new Map()},
  _assinatura(r){return (r||[]).map(x=>`${x.id||''}:${x.placar||''}`).join('|');},
  _faixaPct(p){return `${Math.floor((Number(p)||0)/10)*10}-${Math.floor((Number(p)||0)/10)*10+9}`;},
  _faixaOc(n){n=Number(n)||0; return n<=1?'1':n<=3?'2-3':n<=7?'4-7':n<=15?'8-15':'16+';},
  _faixaTam(n){n=Number(n)||0; return n<=1?'1':n<=3?'2-3':n<=6?'4-6':'7+';},
  _chave(k,m){return [k,this._faixaPct(m?.palpite?.percentual),this._faixaOc(m?.padrao?.ocorrencias?.length),this._faixaTam(m?.padrao?.tamanho)].join('|');},
  _construir(r){
    const assinatura=this._assinatura(r); if(this._cache.assinatura===assinatura)return;
    const registros=[],indice=new Map(), chaves=['exato','gols','r12','bm','ou05','ou15','ou25','ou35'];
    for(let i=1;i<r.length;i++){
      const avaliacao=GreenRed.avaliarPrevisao(r,i); if(!avaliacao)continue;
      const mercados=Previsoes.gerar(r.slice(0,i)).mercados;
      for(const k of chaves){
        const m=mercados[k]; if(!m?.ativo||!m?.palpite||typeof avaliacao[k]!=='boolean')continue;
        const reg={k,green:avaliacao[k],pct:m.palpite.percentual,oc:m.padrao?.ocorrencias?.length||0,tam:m.padrao?.tamanho||0,chave:this._chave(k,m)};
        registros.push(reg); if(!indice.has(reg.chave))indice.set(reg.chave,[]); indice.get(reg.chave).push(reg);
      }
    }
    this._cache={assinatura,registros,indice};
  },
  avaliar(resultados,k,m){
    if(!m?.ativo||!m?.palpite)return {disponivel:false}; this._construir(resultados);
    const chave=this._chave(k,m); const grupo=this._cache.indice.get(chave)||[];
    if(!grupo.length)return {disponivel:false,amostra:0,acertos:0,erros:0,taxa:0};
    const acertos=grupo.filter(x=>x.green).length, erros=grupo.length-acertos, taxa=acertos/grupo.length*100;
    return {disponivel:true,amostra:grupo.length,acertos,erros,taxa,chave};
  },
  resumo(resultados,k,m){
    const a=this.avaliar(resultados,k,m);
    if(!a.disponivel || a.amostra<5){
      const n=a?.amostra||0;
      return {a,texto:`🧠 Ainda aprendendo com situações semelhantes${n?` · ${n} caso(s) observado(s)`:''}`,classe:'muted',sugestao:'⚪ SUGESTÃO: Dados insuficientes — aguarde mais informações',classeSugestao:'muted'};
    }
    const classe=a.taxa>=65?'green':a.taxa>=50?'blue':'red';
    let sugestao,classeSugestao;
    if(a.taxa>=70){sugestao='🟢 SUGESTÃO: Boa oportunidade';classeSugestao='green';}
    else if(a.taxa>=55){sugestao='🟡 SUGESTÃO: Entrar com cautela';classeSugestao='blue';}
    else {sugestao='🔴 SUGESTÃO: Não entrar nessa';classeSugestao='red';}
    return {a,texto:`🧠 Aprendizado: ${a.taxa.toFixed(1)}% de acerto em ${a.amostra} situação(ões) semelhante(s) · ${a.acertos} GREEN / ${a.erros} RED`,classe,sugestao,classeSugestao};
  }
};

"use strict";
const Previsoes={
 gerar(resultados, sequenciaAtual=null){
   // O histórico completo é a base de aprendizado. A sequência atual não pode limitar a consulta ao backup.
   const atual = Array.isArray(sequenciaAtual) && sequenciaAtual.length ? sequenciaAtual : (Array.isArray(resultados) ? resultados.slice(-10) : []);
   const mercados={
     exato:MercadoPlacarExato.analisar(resultados,atual),
     gols:MercadoGolsExatos.analisar(resultados,atual),
     r12:MercadoResultado1X2.analisar(resultados,atual),
     bm:MercadoAmbosMarcam.analisar(resultados,atual),
     ou05:MercadoOverUnder05.analisar(resultados,atual),
     ou15:MercadoOverUnder15.analisar(resultados,atual),
     ou25:MercadoOverUnder25.analisar(resultados,atual),
     ou35:MercadoOverUnder35.analisar(resultados,atual)
   };
   return {mercados};
 },
 valor(m){return m?.palpite?.valor??null},
 percentual(m){return m?.palpite?.percentual??0},
 texto(m,adaptador){return m?.palpite?adaptador.rotulo(m.palpite.valor):'⏳ Aguardando atualizações'}
};

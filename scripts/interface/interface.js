"use strict";

const Interface = {
    iniciar(){
        const app=document.getElementById('app'); if(!app)return;
        this.criarEstilos();
        app.innerHTML=`<div class="painel">
          <header><h1>Painel de Padrões Fictícios</h1>
            <div class="entrada"><input id="campo-resultado" placeholder="Digite o placar (ex: 2x1, 1x0, 3x1)"><button id="btn-registrar" class="azul">▼ Registrar</button><button id="btn-pausar" class="amarelo">▮▮ Pausa</button></div>
            <div class="acoes"><button id="btn-salvar" class="verde">▣ Salvar na Pasta</button><button id="btn-carregar" class="ciano">▰ Carregar da Pasta</button><input id="arquivo-carregar" type="file" accept="application/json" hidden></div>
          </header>
          <div class="topo">
            <section class="cartao azulb probabilidade"><h2>Probabilidade dos Próximos Resultados</h2><div class="cabecalho-probabilidade"><p><b>Total na Sessão: <span id="total-sessao">0</span></b></p><p>Último registro: <b id="ultimo-registro">-</b></p></div><div class="previsao">
              <p>🎯 <b>Previsão combinada:</b> <span id="prev-combinada"></span></p>
              <p>🎯 <b>Placar Exato:</b> <span id="prev-placar"></span></p>
              <p>🏆 <b>Resultado (1X2):</b> <span id="prev-resultado"></span></p>
              <p>📊 <b>Quantidade de Gols:</b> <span id="prev-gols"></span></p>
              <p>🤝 <b>Ambos Marcam:</b> <span id="prev-btts"></span></p>
              <p>⚽ <b>Over / Under 0.5:</b> <span id="prev-ou05"></span></p>
              <p>⚽ <b>Over / Under 1.5:</b> <span id="prev-ou15"></span></p>
              <p>⚽ <b>Over / Under 2.5:</b> <span id="prev-ou25"></span></p>
              <p>⚽ <b>Over / Under 3.5:</b> <span id="prev-ou35"></span></p>
              <p>🔄 <b>Sequência Atual:</b> <span id="sequencia-atual"></span></p><div class="ultimos-registros"><b>Últimos 10 registros:</b><div id="ultimos-sequencia"></div></div>
            </div></section>
          </div>
          <section class="cartao avancada"><h2>Análise Avançada de Gols e Ambos Marcam</h2>
            <div class="mercados"><div><h3>📌 Resultado da Previsão Anterior</h3><div id="anterior"></div></div><div><h3>📊 Outros Mercados</h3><div id="outros"></div></div></div>
            <div class="analise"><h3>🔍 Análise Antecipada de Padrões</h3>
              <div id="grade-mercados" class="grade-mercados"></div>
            </div>
          </section>
          <button id="btn-limpar" class="limpar">Limpar Toda a Sessão Atual</button>
        </div>`;
        this.eventos(); this.atualizar(); console.log('Interface iniciada.');
    },
    eventos(){
        const campo=document.getElementById('campo-resultado');
        document.getElementById('btn-registrar').onclick=()=>{ const v=campo.value.trim(); if(!Historico.adicionar(v)){alert('Digite um placar válido, por exemplo: 2x1');return;} campo.value=''; this.atualizar(); campo.focus(); };
        campo.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btn-registrar').click();});
        document.getElementById('btn-pausar').onclick=()=>{Historico.pausar();this.atualizar();};
        document.getElementById('btn-limpar').onclick=()=>{if(confirm('Limpar toda a sessão atual?')){Historico.limpar();this.atualizar();}};
        document.getElementById('btn-salvar').onclick=()=>{ const blob=new Blob([JSON.stringify(Historico.obterDadosBrutos(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='esportes-virtuais-sessao.json'; a.click(); URL.revokeObjectURL(a.href); };
        const file=document.getElementById('arquivo-carregar'); document.getElementById('btn-carregar').onclick=()=>file.click(); file.onchange=()=>{const f=file.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d))throw Error();Historico.carregarDados(d,true);this.atualizar();}catch(e){alert('Arquivo inválido.');}};r.readAsText(f);};
    },
    status(ok){return ok?'<span class="green">✓ GREEN</span>':'<span class="red">✕ RED</span>';},
    pct(v){return `${v.toFixed(1)}%`;},
    atualizar(){
        const r=Historico.obterTodos(), ultimo=Historico.obterUltimo(), seq=Historico.obterSequenciaAtual();
        const dados=Previsoes.gerar(r,seq).mercados, resumoGreenRed=GreenRed.resumo(r), anterior=resumoGreenRed.anterior, sequencias=resumoGreenRed.sequencias, p=this.pct.bind(this);
        document.getElementById('total-sessao').textContent=r.length; document.getElementById('ultimo-registro').textContent=ultimo?ultimo.placar:'-'; document.getElementById('sequencia-atual').textContent=seq.length;
        const u=seq.slice(-10); document.getElementById('ultimos-sequencia').innerHTML=u.length?u.map(x=>`<span>${x.placar}</span>`).join('<b class="seta">→</b>'):'<span class="muted">Nenhum resultado na sequência atual.</span>';
        const adapter={exato:MercadoPlacarExato,gols:MercadoGolsExatos,r12:MercadoResultado1X2,bm:MercadoAmbosMarcam,ou05:MercadoOverUnder05,ou15:MercadoOverUnder15,ou25:MercadoOverUnder25,ou35:MercadoOverUnder35};
        const texto=k=>{const d=dados[k];return d?.ativo&&d?.palpite?`${adapter[k].rotulo(d.palpite.valor)} <small>(${p(d.palpite.percentual)})</small>`:'⏳ Aguardando atualizações';};
        const freqs=(k,vals)=>vals.map(([v,label])=>{const x=dados[k]?.frequencias.lista.find(a=>a.valor===v);return `<p>• ${label}: <b>${x?p(x.percentual):'—'}</b></p>`}).join('');
        const desc=k=>dados[k]?.ativo?`🔵 PADRÃO ENCONTRADO · ${dados[k].padrao.ocorrencias.length} ocorrência(s) · sequência de ${dados[k].padrao.tamanho}: ${dados[k].padrao.contexto.join(' → ')}`:`⚪ PADRÃO NÃO IDENTIFICADO para a sequência atual. As métricas dos 700+ resultados continuam valendo; sem evidência suficiente, este mercado apenas aguarda e não entra.`;
        document.getElementById('prev-combinada').innerHTML='Motor experimental: sinais liberados somente com evidência histórica ≥ 50%';
        document.getElementById('prev-placar').innerHTML=texto('exato');
        document.getElementById('prev-resultado').innerHTML=texto('r12');
        document.getElementById('prev-gols').innerHTML=texto('gols');
        document.getElementById('prev-btts').innerHTML=texto('bm');
        document.getElementById('prev-ou05').innerHTML=texto('ou05');
        document.getElementById('prev-ou15').innerHTML=texto('ou15');
        document.getElementById('prev-ou25').innerHTML=texto('ou25');
        document.getElementById('prev-ou35').innerHTML=texto('ou35');
        const historicoForma=(st)=>{const ultimos=(st?.historico||[]).slice(-5);if(!ultimos.length)return '<span class="muted">Sem histórico</span>';return `<span class="forma-historico" title="Últimos ${ultimos.length} resultados">${ultimos.map((v,i)=>`<span class="bolinha ${v==='GREEN'?'bolinha-green':'bolinha-red'}" title="${v}" aria-label="${v}"></span>`).join('')}</span>`;};
        const linha=(titulo,k)=>{const st=sequencias[k]; const forma=historicoForma(st); if(!anterior||typeof anterior[k]!=='boolean')return `<div class="item-mercado"><div>• <b>${titulo}:</b> <span class="muted">Aguardando dados</span></div><div class="previsto">Previsto: ${texto(k)}</div><div class="sequencia-individual muted">Sequência: Aguardando dados</div><div class="historico-forma"><span>Últimos 5:</span>${forma}</div></div>`; const ok=anterior[k];const t=st.tipo==='GREEN'?`🔥 <b>${st.atual} GREEN${st.atual===1?'':'S'} consecutivo${st.atual===1?'':'s'}</b>`:`🔴 <b>${st.atual} RED${st.atual===1?'':'S'} consecutivo${st.atual===1?'':'s'}</b>`;return `<div class="item-mercado"><div>• <b>${titulo}:</b> ${this.status(ok)}</div><div class="previsto">Previsto: ${anterior.previsoes[k]||texto(k)}</div><div class="sequencia-individual ${st.tipo==='GREEN'?'green':'red'}">Sequência: ${t}</div><div class="historico-forma"><span>Últimos ${Math.min((st.historico||[]).length,5)}:</span>${forma}</div></div>`;};
        document.getElementById('anterior').innerHTML=linha('Placar Exato','exato')+linha('Over / Under 0.5','ou05')+linha('Over / Under 1.5','ou15')+linha('Over / Under 3.5','ou35');
        document.getElementById('outros').innerHTML=linha('Over / Under 2.5','ou25')+linha('Resultado (1X2)','r12')+linha('Quantidade de Gols','gols')+linha('Ambos Marcam','bm');
        // Painéis de análise padronizados: cada mercado mostra probabilidades, tendência e o padrão que encontrou.
        const tituloTendencia=(k)=>{const d=dados[k];const fonte=d?.frequenciasHistorico||d?.frequencias;const top=fonte?.lista?.[0];if(!top)return '🎯 Tendência histórica: <span class="muted">Sem histórico</span>';const label=adapter[k]?.rotulo?adapter[k].rotulo(top.valor):top.valor;const entrada=d?.palpite?` · Entrada: <span class="green">${adapter[k].rotulo(d.palpite.valor)} (${p(d.palpite.percentual)})</span>`:' · Entrada: <span class="muted">⏳ AGUARDAR — padrão não identificado</span>';return `🎯 Tendência histórica: <span class="green">${label} (${p(top.percentual)})</span>${entrada}`;};
        const sequenciaPadrao=(k)=>`<h4>📌 Sequência</h4><p>${desc(k)}</p>`;
        const aprendizado=(k)=>{const a=(typeof Aprendizado!=='undefined')?Aprendizado.resumo(r,k,dados[k]):{texto:'🧠 Aprendizado indisponível',classe:'muted',sugestao:'⚪ SUGESTÃO: Dados insuficientes',classeSugestao:'muted'};return `<div class="aprendizado ${a.classe}">${a.texto}<div class="sugestao ${a.classeSugestao||'muted'}">${a.sugestao||''}</div></div>`;};
        const bloco=(titulo,conteudo,k)=>{const st=sequencias[k]||{};const tg=Number(st.totalGreens)||0,tr=Number(st.totalReds)||0;return `<section class="painel-mercado"><h3>${titulo}</h3><div class="totais-mercado"><span class="total-green">🟢 GREEN: ${tg}</span><span class="total-red">🔴 RED: ${tr}</span></div>${conteudo}<h4>${tituloTendencia(k)}</h4>${sequenciaPadrao(k)}${aprendizado(k)}</section>`;};
        const freqLista=(k,vals)=>{const fonte=dados[k]?.frequenciasHistorico||dados[k]?.frequencias;return vals.map(([v,label])=>{const x=fonte?.lista?.find(a=>String(a.valor)===String(v));return `<p>• ${label}: <b>${x?p(x.percentual):'—'}</b></p>`}).join('');};
        const freqTop=(k,limite=3)=>{
            const fonte=dados[k]?.frequenciasHistorico||dados[k]?.frequencias;
            const lista=[...(fonte?.lista||[])].sort((a,b)=>b.percentual-a.percentual).slice(0,limite);
            return lista.length?lista.map(x=>`<p>• ${adapter[k].rotulo(x.valor)}: <b>${p(x.percentual)}</b></p>`).join(''):'<p class="muted">• Aguardando atualizações</p>';
        };
        const golsLista=()=>{const fonte=dados.gols?.frequenciasHistorico||dados.gols?.frequencias;return [0,1,2,3,4,5].map(g=>{const x=(fonte?.lista||[]).find(a=>Number(a.valor)===g);return `<p>• ${g===5?'5 ou mais gols':g+' gol'+(g===1?'':'s')}: <b>${x?p(x.percentual):'—'}</b></p>`}).join('');};

        // Mantém o painel superior de resultado da previsão anterior, onde GREEN/RED realmente pertence.
        // Grade visual: seis cartões independentes, aproveitando toda a largura disponível.
        const paineis = [
          bloco('🎯 Placar Exato', freqTop('exato',3), 'exato'),
          bloco('🏆 Resultado do Jogo (1X2)', freqLista('r12', [['1','Vitória da Casa'],['X','Empate'],['2','Vitória do Visitante']]), 'r12'),
          bloco('🤝 Ambos Marcam', freqLista('bm', [['SIM','SIM'],['NÃO','NÃO']]), 'bm'),
          bloco('📊 Quantidade de Gols', golsLista(), 'gols'),
          bloco('⚽ Over / Under 0.5', freqLista('ou05', [['MENOS','Menos de 0.5'],['MAIS','Mais de 0.5']]), 'ou05'),
          bloco('⚽ Over / Under 1.5', freqLista('ou15', [['MENOS','Menos de 1.5'],['MAIS','Mais de 1.5']]), 'ou15'),
          bloco('⚽ Over / Under 2.5', freqLista('ou25', [['MENOS','Menos de 2.5'],['MAIS','Mais de 2.5']]), 'ou25'),
          bloco('⚽ Over / Under 3.5', freqLista('ou35', [['MENOS','Menos de 3.5'],['MAIS','Mais de 3.5']]), 'ou35')
        ];
        document.getElementById('grade-mercados').innerHTML=paineis.join('');
    },
    criarEstilos(){ if(document.getElementById('estilos-painel'))return; const st=document.createElement('style');st.id='estilos-painel';st.textContent=`*{box-sizing:border-box}body{margin:0;padding:10px;background:#eee;font-family:Arial,sans-serif;color:#1e293b;font-size:14px}.painel{max-width:1180px;margin:auto;background:#fff;border:1px solid #d6dce5;border-radius:4px;padding:14px;box-shadow:0 1px 4px #bbb}h1{margin:0 0 12px;font-size:22px}h2{font-size:17px;margin:0 0 14px}h3,h4{font-size:13px;margin:12px 0 8px}p{margin:6px 0;line-height:1.35}.entrada{display:flex;gap:8px}.entrada input{flex:1;height:36px;border:1px solid #c5ccd5;padding:8px;font-size:14px}.entrada button,.acoes button{border:0;padding:9px 15px;color:#fff;font-weight:bold;font-size:13px;cursor:pointer;border-radius:2px}.amarelo{background:#ffc107!important;color:#222!important}.azul{background:#2684d9}.verde{background:#199c53}.ciano{background:#278ea5}.acoes{margin:10px 0 12px;padding:9px;background:#dfe5ed}.topo{display:grid;grid-template-columns:1fr;gap:12px}.probabilidade{min-height:auto}.cabecalho-probabilidade{display:flex;gap:28px;flex-wrap:wrap;margin-bottom:8px}.probabilidade .previsao{display:grid;grid-template-columns:1fr 1fr;column-gap:30px;row-gap:2px}.cartao{background:#f5f7fa;border-left:3px solid #2784e8;padding:13px;min-height:250px}.avancada{border-left-color:#24a34a;margin-top:12px;min-height:auto}.ultimos-registros{margin-top:8px;line-height:2.1}.ultimos-registros b{font-size:13px}.ultimos-registros span{display:inline-block;font-size:14px}.seta{margin:0 5px;color:#64748b}.streak{margin:5px 0}.mercados{display:grid;grid-template-columns:1fr 1fr;gap:32px;border:1px solid #cbd3dc;border-radius:10px;background:#fff;padding:15px}.mercados h3{font-size:16px;margin:3px 0 14px}.item-mercado{margin:0 0 14px;font-size:17px;line-height:1.45}.item-mercado>div:first-child{font-size:18px}.previsto{margin-left:0;color:#596273;font-size:16px}.sequencia-individual{margin-top:3px;font-size:16px}.historico-forma{display:flex;align-items:center;gap:8px;margin-top:7px;font-size:14px;color:#596273;font-weight:bold}.forma-historico{display:inline-flex;align-items:center;gap:6px}.bolinha{width:13px;height:13px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.12);box-shadow:inset 0 1px 1px rgba(255,255,255,.35),0 1px 2px rgba(0,0,0,.16)}.bolinha-green{background:#25a95a}.bolinha-red{background:#df4050}.grade-mercados{column-count:3;column-gap:16px;margin-top:12px}.painel-mercado{display:inline-block;width:100%;vertical-align:top;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;margin:0 0 16px;background:#fff;border:1px solid #cbd3dc;border-radius:10px;padding:14px;min-width:0;min-height:0;box-shadow:0 1px 2px rgba(0,0,0,.04)}.painel-mercado h3{font-size:17px;margin:2px 0 6px;padding-bottom:8px;border-bottom:1px solid #e1e6ec}.totais-mercado{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 10px;padding:5px 7px;background:#f7f8fa;border:1px solid #e2e6eb;border-radius:5px;font-size:13px;font-weight:bold}.total-green{color:#159447}.total-red{color:#df4050}.painel-mercado h4{font-size:15px;margin:13px 0 7px}.painel-mercado p{font-size:14px;overflow-wrap:anywhere}.aprendizado{margin-top:12px;padding-top:9px;border-top:1px dashed #d9dee5;font-size:13px;line-height:1.4;font-weight:bold}.sugestao{margin-top:7px;font-size:14px;font-weight:bold}.analise h4{font-size:14px}.green{color:#159447;font-weight:bold}.red{color:#df4050;font-weight:bold}.blue{color:#1875d1;font-weight:bold}.muted{color:#777}.limpar{width:100%;margin-top:12px;border:0;background:#df3742;color:white;padding:10px;font-weight:bold;cursor:pointer;font-size:13px}@media(max-width:900px){.grade-mercados{column-count:2}}@media(max-width:700px){body{font-size:15px}.topo,.mercados,.probabilidade .previsao{grid-template-columns:1fr}.grade-mercados{column-count:1}.entrada{flex-wrap:wrap}.entrada input{flex-basis:100%}.lista{grid-template-columns:1fr}.item-mercado{font-size:16px}.item-mercado>div:first-child{font-size:17px}}
/* ===== ADAPTAÇÃO MOBILE/PWA — somente visual ===== */
@supports (padding: env(safe-area-inset-top)) {
  body {
    padding-top: calc(10px + env(safe-area-inset-top));
    padding-right: calc(10px + env(safe-area-inset-right));
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    padding-left: calc(10px + env(safe-area-inset-left));
  }
}
button, input { touch-action: manipulation; }
button { -webkit-tap-highlight-color: transparent; }
@media (max-width: 700px) {
  body { padding: 8px; overflow-x: hidden; }
  .painel { width: 100%; padding: 10px; border-radius: 8px; }
  h1 { font-size: 20px; }
  h2 { font-size: 16px; }
  .entrada { gap: 7px; }
  .entrada input {
    width: 100%;
    min-width: 0;
    height: 44px;
    font-size: 16px;
    border-radius: 7px;
  }
  .entrada button, .acoes button {
    min-height: 44px;
    flex: 1 1 auto;
    padding: 10px 12px;
    border-radius: 7px;
    font-size: 14px;
  }
  .acoes {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    padding: 8px;
    border-radius: 7px;
  }
  .acoes button { flex: 1 1 140px; }
  .cartao { padding: 11px; }
  .probabilidade .previsao { gap: 0; }
  .probabilidade .previsao p { margin: 8px 0; }
  .mercados { padding: 10px; gap: 16px; border-radius: 8px; }
  .item-mercado { font-size: 15px; }
  .item-mercado > div:first-child { font-size: 16px; }
  .painel-mercado { padding: 12px; border-radius: 8px; }
  .painel-mercado h3 { font-size: 16px; }
  .totais-mercado { gap: 8px; font-size: 12px; }
  .painel-mercado p { font-size: 13px; }
  .limpar { min-height: 44px; border-radius: 7px; font-size: 14px; }
}

`;
document.head.appendChild(st); }
};

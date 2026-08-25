"use strict";
document.addEventListener('DOMContentLoaded',()=>{
  if(typeof Backup==='undefined'||typeof Historico==='undefined'||typeof Interface==='undefined'){console.error('Módulos principais não encontrados.');return;}
  Historico.iniciar();
  const salvo=typeof Armazenamento!=='undefined'?Armazenamento.obterDados():[];
  // Se houver um histórico local antigo menor que o Backup atual, usa o Backup atual como base de aprendizado.
  // Depois que novos resultados forem adicionados, o armazenamento local passa a ser preservado.
  const VERSAO_BACKUP = '2026-08-24-700PLUS';
  const versaoLocal = localStorage.getItem('esportes_virtuais_backup_versao');
  const dadosIniciais = (versaoLocal === VERSAO_BACKUP && Array.isArray(salvo) && salvo.length >= Backup.length) ? salvo : Backup;
  localStorage.setItem('esportes_virtuais_backup_versao', VERSAO_BACKUP);
  Historico.carregarDados(dadosIniciais,false);
  console.log('Resultados carregados:',Historico.obterQuantidade());
  console.log('Sequências encerradas:',Historico.obterQuantidadeSequencias());
  Interface.iniciar();
});

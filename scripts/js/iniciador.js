"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof Historico === "undefined" || typeof Interface === "undefined") {
      throw new Error("Módulos principais não encontrados.");
    }

    let backupAtual;

    if (typeof Backup !== "undefined" && Array.isArray(Backup)) {
      backupAtual = Backup;
    } else {
      const resposta = await fetch("./scripts/backup/backup.js", {
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(`Não foi possível carregar o backup (${resposta.status}).`);
      }

      const textoBackup = (await resposta.text()).trim();
      backupAtual = JSON.parse(textoBackup);
    }

    if (!Array.isArray(backupAtual)) {
      throw new Error("O backup carregado não contém uma lista válida de resultados.");
    }

    Historico.iniciar();

    const salvo = typeof Armazenamento !== "undefined"
      ? Armazenamento.obterDados()
      : [];

    const VERSAO_BACKUP = "2026-08-24-700PLUS";
    const versaoLocal = localStorage.getItem("esportes_virtuais_backup_versao");

    const dadosIniciais = (
      versaoLocal === VERSAO_BACKUP &&
      Array.isArray(salvo) &&
      salvo.length >= backupAtual.length
    ) ? salvo : backupAtual;

    localStorage.setItem("esportes_virtuais_backup_versao", VERSAO_BACKUP);

    Historico.carregarDados(dadosIniciais, false);

    console.log("Resultados carregados:", Historico.obterQuantidade());
    console.log("Sequências encerradas:", Historico.obterQuantidadeSequencias());

    Interface.iniciar();
  } catch (erro) {
    console.error("Erro ao iniciar o aplicativo:", erro);
  }
});

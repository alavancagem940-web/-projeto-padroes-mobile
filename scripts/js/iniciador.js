"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof Historico === "undefined" || typeof Interface === "undefined") {
      throw new Error("Módulos principais não encontrados.");
    }

    let backup;

    if (typeof Backup !== "undefined" && Array.isArray(Backup)) {
      backup = Backup;
    } else {
      const resposta = await fetch("./scripts/backup/backup.js", {
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(`Não foi possível carregar o backup (${resposta.status}).`);
      }

      const textoBackup = (await resposta.text()).trim();
      backup = JSON.parse(textoBackup);
    }

    if (!Array.isArray(backup)) {
      throw new Error("O backup carregado não contém uma lista válida de resultados.");
    }

    // Disponibiliza o backup para os demais módulos.
    globalThis.Backup = backup;

    Historico.iniciar();

    const salvo = typeof Armazenamento !== "undefined"
      ? Armazenamento.obterDados()
      : [];

    const VERSAO_BACKUP = "2026-08-25-877PLUS";
    const versaoLocal = localStorage.getItem("esportes_virtuais_backup_versao");

    const dadosIniciais = (
      versaoLocal === VERSAO_BACKUP &&
      Array.isArray(salvo) &&
      salvo.length >= backup.length
    ) ? salvo : backup;

    localStorage.setItem("esportes_virtuais_backup_versao", VERSAO_BACKUP);

    Historico.carregarDados(dadosIniciais, false);

    console.log("Resultados carregados:", Historico.obterQuantidade());
    console.log("Sequências encerradas:", Historico.obterQuantidadeSequencias());

    Interface.iniciar();
  } catch (erro) {
    console.error("Erro ao iniciar o aplicativo:", erro);
  }
});

"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof Historico === "undefined" || typeof Interface === "undefined") {
      throw new Error("Módulos principais não encontrados.");
    }

    // O backup é carregado diretamente pelo script backup.js.
    // Isso permite abrir o projeto localmente (file://) sem depender de fetch.
    const backupAtual = (typeof Backup !== "undefined" && Array.isArray(Backup)) ? Backup : null;
    if (!backupAtual) {
      throw new Error("Backup não carregado. Verifique scripts/backup/backup.js.");
    }

    if (!Array.isArray(backupAtual)) {
      throw new Error("O backup carregado não contém uma lista válida de resultados.");
    }

    globalThis.Backup = backupAtual;

    Historico.iniciar();

    // O BACKUP é exclusivamente base de aprendizado.
    // O histórico atual é reconstruído separadamente a partir dos resultados ao-vivo locais
    // e, quando configurado, do banco compartilhado.
    const VERSAO_BACKUP = "2026-08-26-847PLUS-TEMPORAL-CICLO5S-OUTROHORARIO-SHARED";
    const versaoLocal = localStorage.getItem("esportes_virtuais_backup_versao");
    const salvo = typeof Armazenamento !== "undefined" ? Armazenamento.obterDados() : [];

    // Captura somente objetos marcados como ao-vivo. Nenhum resultado do backup
    // entra no histórico compartilhado.
    const locaisAoVivo = Array.isArray(salvo)
      ? salvo.filter(x => x && typeof x === "object" && x.fonte === "ao-vivo" && x.placar && x._temporal?.data && x._temporal?.horario)
      : [];

    // Ao trocar de versão, metadados antigos de horários não devem contaminar a sessão.
    if (versaoLocal !== VERSAO_BACKUP && typeof Armazenamento !== "undefined") {
      Armazenamento.salvarMetadadosTemporais([]);
      Armazenamento.salvarHorariosSemDados([]);
    }
    localStorage.setItem("esportes_virtuais_backup_versao", VERSAO_BACKUP);

    Historico.carregarDados(backupAtual, false, {baseQuantidade: backupAtual.length});
    // O backup é sempre a base de estudo; a sequência atual começa vazia antes
    // de receber os resultados ao-vivo locais/remotos.
    Historico.definirBaseEstudo(backupAtual.length);
    localStorage.setItem("esportes_virtuais_base_estudo_qtd", String(backupAtual.length));

    // Banco compartilhado: quando configurado, resultados registrados por qualquer
    // usuário entram no mesmo histórico atual para todos.
    if (typeof Sincronizacao !== "undefined" && Sincronizacao.configurada()) {
      Sincronizacao.observar(lista => {
        Historico.importarResultadosAoVivo(lista, true);
        if (typeof Interface !== "undefined" && Interface.atualizar) Interface.atualizar();
      });
      await Sincronizacao.iniciar();
    } else if (locaisAoVivo.length) {
      // Fallback local: sem banco configurado, preserva somente os resultados
      // ao-vivo deste dispositivo. O backup continua separado.
      Historico.importarResultadosAoVivo(locaisAoVivo, true);
    }

    // Se o app foi fechado durante uma partida, o último palpite salvo é
    // associado uma única vez ao horário da partida que estiver rolando na
    // abertura. O palpite não é recalculado para essa partida.
    if (typeof PalpitesRegistrados !== "undefined" && typeof RelogioPartidas !== "undefined") {
      const atual = RelogioPartidas.partidaAtual();
      const temResultado = Historico.temResultadoNoHorario(atual);
      const temPalpite = PalpitesRegistrados.obterParaPartida(atual);
      const ultimoPalpite = PalpitesRegistrados.obterUltimo();
      if (!temResultado && !temPalpite && ultimoPalpite?.palpites) {
        PalpitesRegistrados.registrarParaPartida(atual, ultimoPalpite.palpites, "reabertura-app");
        console.log("Último palpite associado à partida atual:", atual.horario);
      }
    }

    console.log("Resultados carregados:", Historico.obterQuantidade());
    console.log("Sequências encerradas:", Historico.obterQuantidadeSequencias());

    Interface.iniciar();
  } catch (erro) {
    console.error("Erro ao iniciar o aplicativo:", erro);
  }
});

"use strict";

const Armazenamento = {
    CHAVE_STORAGE: "esportes_virtuais_sessao_v2",
    obterDados() {
        try { return JSON.parse(localStorage.getItem(this.CHAVE_STORAGE)) || []; }
        catch (e) { console.error("Erro ao ler armazenamento:", e); return []; }
    },
    salvarDados(dados) {
        try { localStorage.setItem(this.CHAVE_STORAGE, JSON.stringify(dados)); return true; }
        catch (e) { console.error("Erro ao salvar:", e); return false; }
    },
    limpar() { localStorage.removeItem(this.CHAVE_STORAGE); }
};

"use strict";

const Historico = {
    resultados: [], sequencias: [], sequenciaAtual: [], dadosBrutos: [],

    iniciar() { this.limpar(false); console.log("Histórico iniciado."); },
    validarPlacar(placar) { return typeof placar === "string" && /^\d+x\d+$/i.test(placar.trim()); },
    criarResultado(placar) {
        const [casa, fora] = placar.trim().toLowerCase().split("x").map(Number);
        return { id: this.resultados.length + 1, placar: `${casa}x${fora}`, golsCasa:casa, golsFora:fora, totalGols:casa+fora, data:new Date().toISOString() };
    },
    adicionar(placar, salvar=true) {
        if (!this.validarPlacar(placar)) return false;
        const r = this.criarResultado(placar);
        this.resultados.push(r); this.sequenciaAtual.push(r); this.dadosBrutos.push(r.placar);
        if (salvar && typeof Armazenamento !== "undefined") Armazenamento.salvarDados(this.dadosBrutos);
        return r;
    },
    pausar(salvar=true) {
        if (this.sequenciaAtual.length) this.sequencias.push([...this.sequenciaAtual]);
        this.sequenciaAtual=[]; this.dadosBrutos.push("PAUSA");
        if (salvar && typeof Armazenamento !== "undefined") Armazenamento.salvarDados(this.dadosBrutos);
        console.log("Sequência encerrada pela pausa.");
    },
    carregarDados(dados, salvar=false) {
        if (!Array.isArray(dados)) return false;
        this.limpar(false);
        dados.forEach(item => { if (item === "PAUSA") this.pausar(false); else if (typeof item === "string") this.adicionar(item,false); else if (item && item.placar) this.adicionar(item.placar,false); });
        if (salvar && typeof Armazenamento !== "undefined") Armazenamento.salvarDados(this.dadosBrutos);
        return true;
    },
    obterTodos(){ return [...this.resultados]; },
    obterUltimo(){ return this.resultados.at(-1) || null; },
    obterQuantidade(){ return this.resultados.length; },
    obterQuantidadeSequencias(){ return this.sequencias.length; },
    obterSequenciaAtual(){ return [...this.sequenciaAtual]; },
    obterSequencias(){ return this.sequencias.map(s=>[...s]); },
    obterDadosBrutos(){ return [...this.dadosBrutos]; },
    limpar(apagarStorage=true){ this.resultados=[]; this.sequencias=[]; this.sequenciaAtual=[]; this.dadosBrutos=[]; if(apagarStorage && typeof Armazenamento!=="undefined") Armazenamento.limpar(); }
};

import React, { useState, useRef, useEffect } from "react";
import { 
  BarChart3, PieChart, Activity, Target, Settings, 
  ArrowUpRight, ArrowDownRight, Filter, Download, 
  AlertTriangle, CheckCircle2, Search, BrainCircuit,
  Megaphone, Funnel, DollarSign, MousePointerClick,
  Eye, ShoppingBag, RefreshCw, Layers, Users, Edit3,
  Bot, Send, Sparkles, Calculator, X, Save, TrendingUp,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// --- MOCK DATA INICIAL ---
const METAS_INICIAIS = {
  topo_cpm_max: 25.00,
  topo_viewability_min: 0.70,
  meio_custo_visita_max: 4.00,
  fundo_roas_min: 3.00,
  fundo_cpa_max: 220.00
};

const DADOS_EXECUTIVOS_INIT = [
  { id: 'dv360', canal: "DV360", invest: 104718.55, rec: 208483.84, leads: 2729, vendas: 308, cpa: 38.37, roas: 1.99, status: "🔴" },
  { id: 'meta', canal: "Meta", invest: 85397.76, rec: 292552.44, leads: 2437, vendas: 404, cpa: 35.04, roas: 3.42, status: "🔴" },
  { id: 'google', canal: "Google", invest: 87094.78, rec: 223447.12, leads: 2473, vendas: 374, cpa: 35.21, roas: 2.56, status: "🟢" },
];

const DADOS_FUNIL = {
  topo: [
    { campanha: "Prospecting Contextual", canal: "DV360", imp: 1367896, cpm: 16.80, view: "76%", status: "🔴" },
    { campanha: "Vídeo Awareness", canal: "Meta", imp: 1336689, cpm: 12.30, view: "82%", status: "🟢" },
    { campanha: "Lookalike VIP", canal: "Google", imp: 826658, cpm: 15.74, view: "79%", status: "🟢" },
  ],
  meio: [
    { campanha: "Conteúdo Benefícios", canal: "DV360", sessões: 13572, ctr: "0.92%", custo_visita: 4.74, status: "🔴" },
    { campanha: "Prova Social", canal: "Meta", sessões: 18854, ctr: "1.33%", custo_visita: 1.14, status: "🟢" },
  ],
  fundo: [
    { campanha: "Carrinho Abandonado", canal: "Google", vendas: 132, roas: 5.94, cpa: 31.83, status: "🟢" },
    { campanha: "Retarget 1-7d", canal: "Meta", vendas: 215, roas: 4.06, cpa: 21.37, status: "🔴" },
  ]
};

const DADOS_CRIATIVOS = [
  { nome: "Video 15s | Dor -> Prova", etapa: "Topo", canal: "Meta", ctr: "1.84%", vtr: "26%", cvr: "4.41%", status: "🟢" },
  { nome: "Display | Benefício Principal", etapa: "Meio", canal: "Google", ctr: "0.75%", vtr: "-", cvr: "2.69%", status: "🔴" },
  { nome: "UGC | Oferta + Urgência", etapa: "Fundo", canal: "DV360", ctr: "1.57%", vtr: "46%", cvr: "3.57%", status: "🟢" },
];

export default function Media() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'funnel' | 'creative' | 'settings'>('dashboard');
  const [metas, setMetas] = useState(METAS_INICIAIS);
  
  // STATE: DADOS EXECUTIVOS
  const [execData, setExecData] = useState(DADOS_EXECUTIVOS_INIT);
  const [showInvestModal, setShowInvestModal] = useState(false);
  
  // STATE: FILTROS
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
      period: "Este Mês",
      channels: { dv360: true, meta: true, google: true }
  });
  
  // STATE: EDIÇÃO
  const [tempInvest, setTempInvest] = useState<{ [key: string]: string }>({});

  // STATE: DIAGNÓSTICO
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsList, setDiagnosticsList] = useState<any[]>([]);

  // STATE: CHAT
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', content: string}[]>([
      { role: 'ai', content: "Vamos otimizar essa campanha." }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- HELPERS CÁLCULO ---
  const filteredData = execData.filter(d => activeFilters.channels[d.id as keyof typeof activeFilters.channels]);

  const totalInvest = filteredData.reduce((acc, curr) => acc + curr.invest, 0);
  const totalReceita = filteredData.reduce((acc, curr) => acc + curr.rec, 0);
  const totalLeads = filteredData.reduce((acc, curr) => acc + curr.leads, 0);
  const totalVendas = filteredData.reduce((acc, curr) => acc + curr.vendas, 0);
  
  const roasGeral = totalInvest > 0 ? (totalReceita / totalInvest).toFixed(2) : "0.00";
  const cpaGeral = totalLeads > 0 ? (totalInvest / totalLeads).toFixed(2) : "0.00";

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- HANDLERS: INVESTIMENTO ---
  const openInvestModal = () => {
      const currentValues: any = {};
      execData.forEach(ch => currentValues[ch.id] = String(ch.invest));
      setTempInvest(currentValues);
      setShowInvestModal(true);
  };

  const saveInvestments = () => {
      const newData = execData.map(ch => {
          const newValString = tempInvest[ch.id] || "0";
          const newInvest = parseFloat(newValString);
          
          let safeRoas = ch.roas;
          if (ch.invest < 100 || safeRoas > 50) safeRoas = 3.5; 

          const currentCpa = ch.cpa > 0 ? ch.cpa : 40;
          
          const projectedRevenue = newInvest * safeRoas;
          const projectedLeads = Math.floor(newInvest / currentCpa);
          const ticketMedio = (ch.rec / (ch.vendas || 1)) || 500;
          const projectedSales = Math.floor(projectedRevenue / ticketMedio); 

          return {
              ...ch,
              invest: newInvest,
              rec: projectedRevenue,
              leads: projectedLeads,
              vendas: projectedSales,
              roas: safeRoas
          };
      });

      setExecData(newData);
      setShowInvestModal(false);
      
      const newTotal = newData.reduce((a,b)=>a+b.invest,0);
      toast.success(`Cenário recalculado! Novo Budget: ${formatCurrency(newTotal)}`);
      setChatHistory(prev => [...prev, { role: 'ai', content: `Atualizei suas projeções. Com o novo budget de **${formatCurrency(newTotal)}**, estimamos uma receita de **${formatCurrency(newData.reduce((a,b)=>a+b.rec,0))}**.` }]);
  };

  // --- HANDLERS: METAS ---
  const handleSaveMetas = () => {
      toast.success("Novas metas de KPI salvas com sucesso!");
      setTimeout(() => runDiagnostics(), 500);
  };

  // --- HANDLERS: FILTROS ---
  const toggleChannelFilter = (channel: 'dv360' | 'meta' | 'google') => {
      setActiveFilters(prev => ({
          ...prev,
          channels: { ...prev.channels, [channel]: !prev.channels[channel] }
      }));
  };

  const applyFilters = () => {
      setShowFilterModal(false);
      toast.success("Filtros aplicados ao Dashboard.");
  };

  // --- HANDLERS: EXPORTAR CSV ---
  const handleExportCSV = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Canal,Investimento,Receita,Leads,Vendas,CPA,ROAS,Status\n";
      execData.forEach(row => {
          const rowStr = `${row.canal},${row.invest.toFixed(2)},${row.rec.toFixed(2)},${row.leads},${row.vendas},${row.cpa.toFixed(2)},${row.roas.toFixed(2)},${row.status}`;
          csvContent += rowStr + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "performance_midia_iagencia.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Relatório CSV baixado!");
  };

  const runDiagnostics = () => {
    setShowDiagnostics(true);
    const alerts: any[] = [];
    DADOS_FUNIL.topo.forEach(c => { if (c.cpm > metas.topo_cpm_max) alerts.push({ nivel: 'alerta', local: `Topo - ${c.campanha}`, problema: `CPM R$ ${c.cpm}`, solucao: "Expandir público ou trocar criativo." }); });
    DADOS_FUNIL.fundo.forEach(c => { if (c.roas < metas.fundo_roas_min) alerts.push({ nivel: 'critico', local: `Fundo - ${c.campanha}`, problema: `ROAS ${c.roas}`, solucao: "Otimizar bid ou pausar campanha." }); });
    setDiagnosticsList(alerts);
    toast.success("Diagnóstico de IA concluído!");
  };

  const handleChatSubmit = () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput;
      setChatInput("");
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

      setTimeout(() => {
          let aiResponse = "";
          const lowerMsg = userMsg.toLowerCase();

          if (lowerMsg.includes("20%") || lowerMsg.includes("aumentar")) {
              aiResponse = `Simulando aumento de 20% no budget global (aprox. +${formatCurrency(totalInvest * 0.2)}):\n\n🚀 **Projeção de Impacto:**\n- Receita Adicional: +${formatCurrency(totalReceita * 0.18)} (ROAS marginal decrescente)\n- Novos Leads: +${Math.floor(totalLeads * 0.2)}\n\nRecomendo concentrar 70% desse aumento no **Google** (maior consistência) e 30% em testes de vídeo no **Meta**.`;
          } else if (lowerMsg.includes("split") || lowerMsg.includes("sugestão")) {
              aiResponse = "Com base na atribuição atual, meu **Split Ideal** para maximizar ROAS seria:\n\n🔵 **Google: 45%** (Aumentar)\n🟠 **Meta: 35%** (Manter)\n🟢 **DV360: 20%** (Reduzir levemente para otimizar CPM)\n\nIsso deve equilibrar volume de vendas com custo de aquisição.";
          } else if (lowerMsg.includes("otimizar")) {
              aiResponse = "⚡ **Otimização Rápida Detectada:**\n\nO canal **DV360** está com ROAS de 1.99 (abaixo da média). O **Meta** está performando muito bem com ROAS 3.42.\n\nSugiro mover **R$ 15.000** do DV360 para o Meta imediatamente. Isso pode gerar um ganho líquido de **R$ 21.000** em receita sem gastar um centavo a mais.";
          } else {
              aiResponse = `Entendido. Estou analisando seus dados. Posso recalcular metas ou sugerir novos canais. Tente: "Qual o melhor canal para leads?"`;
          }

          setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-black shrink-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers className="w-6 h-6 text-orange-500" /> Mídia Programática</h1>
          
          {/* TABS DE NAVEGAÇÃO COM ALERTA INTELIGENTE (RED DOT) */}
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setActiveTab('dashboard')} className={`relative px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'dashboard' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                Executivo
            </button>
            <button onClick={() => setActiveTab('funnel')} className={`relative px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'funnel' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                Funil Full
                {[...DADOS_FUNIL.topo, ...DADOS_FUNIL.meio, ...DADOS_FUNIL.fundo].some(i => i.status === "🔴") && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-zinc-900"></span>
                )}
            </button>
            <button onClick={() => setActiveTab('creative')} className={`relative px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'creative' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                Criativos
                {DADOS_CRIATIVOS.some(i => i.status === "🔴") && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-zinc-900"></span>
                )}
            </button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'settings' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                Metas
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" size="sm" onClick={() => setShowFilterModal(true)} className="border-zinc-700 text-zinc-400 hover:text-white gap-2 text-xs"><Filter className="w-3 h-3" /> Filtros</Button>
           <Button onClick={runDiagnostics} size="sm" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs gap-2 shadow-lg shadow-orange-900/20"><BrainCircuit className="w-4 h-4" /> Diagnóstico IA</Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* --- ABA 1: DASHBOARD EXECUTIVO --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             
             {/* CARDS TOTAIS */}
             <div className="grid grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl relative group hover:border-orange-500/30 transition-colors">
                   <div className="flex justify-between items-start">
                       <p className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-2"><DollarSign className="w-3 h-3 text-green-500"/> Investimento Total</p>
                       <button onClick={openInvestModal} className="text-zinc-600 hover:text-white transition bg-zinc-800 p-1.5 rounded-md hover:bg-orange-600" title="Editar Verba"><Edit3 className="w-3 h-3" /></button>
                   </div>
                   <h3 className="text-2xl font-bold text-white">{formatCurrency(totalInvest)}</h3>
                   <span className="text-[10px] text-green-400 flex items-center mt-1"><ArrowUpRight className="w-2 h-2 mr-1"/> Verba ativa</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-2"><ShoppingBag className="w-3 h-3 text-blue-500"/> Receita Gerada</p>
                   <h3 className="text-2xl font-bold text-white">{formatCurrency(totalReceita)}</h3>
                   <span className="text-[10px] text-green-400 flex items-center mt-1"><ArrowUpRight className="w-2 h-2 mr-1"/> ROAS Geral: {roasGeral}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-2"><Users className="w-3 h-3 text-purple-500"/> Leads Totais</p>
                   <h3 className="text-2xl font-bold text-white">{totalLeads.toLocaleString()}</h3>
                   <span className="text-[10px] text-red-400 flex items-center mt-1"><ArrowDownRight className="w-2 h-2 mr-1"/> CPA Médio: R$ {cpaGeral}</span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-2"><Target className="w-3 h-3 text-orange-500"/> Vendas Totais</p>
                   <h3 className="text-2xl font-bold text-white">{totalVendas.toLocaleString()}</h3>
                   <span className="text-[10px] text-zinc-400 flex items-center mt-1">Taxa Conv. Média: 14%</span>
                </div>
             </div>

             {/* TABELA DE CANAIS */}
             <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                       <h3 className="text-sm font-bold text-white">Performance por Canal</h3>
                       <div className="flex items-center gap-3 text-[10px] bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">
                           <span className="flex items-center gap-1 text-zinc-400"><span className="text-xs">🔴</span> Abaixo da Meta</span>
                           <span className="flex items-center gap-1 text-zinc-400"><span className="text-xs">🟢</span> Acima da Meta</span>
                       </div>
                   </div>

                   <div className="flex gap-2">
                       <Button variant="outline" size="sm" className="h-7 text-[10px] border-zinc-700 hover:bg-zinc-800" onClick={openInvestModal}><Edit3 className="w-3 h-3 mr-1"/> Editar Verbas</Button>
                       <Button variant="ghost" size="sm" onClick={handleExportCSV} className="h-7 text-[10px] text-zinc-500 hover:text-white"><Download className="w-3 h-3 mr-1"/> Exportar CSV</Button>
                   </div>
                </div>
                <table className="w-full text-left text-sm">
                   <thead className="bg-zinc-900/50 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr><th className="px-6 py-3">Canal</th><th className="px-6 py-3">Investimento</th><th className="px-6 py-3">Receita</th><th className="px-6 py-3">Leads</th><th className="px-6 py-3">Vendas</th><th className="px-6 py-3">CPA</th><th className="px-6 py-3">ROAS</th><th className="px-6 py-3 text-center">Status</th></tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800">
                      {filteredData.map((row, i) => (
                         <tr key={i} className="hover:bg-zinc-900/20 transition">
                            <td className="px-6 py-4 font-bold text-zinc-300">{row.canal}</td>
                            <td className="px-6 py-4 text-white font-medium">{formatCurrency(row.invest)}</td>
                            <td className="px-6 py-4 text-green-400">{formatCurrency(row.rec)}</td>
                            <td className="px-6 py-4">{Math.floor(row.leads).toLocaleString()}</td>
                            <td className="px-6 py-4">{Math.floor(row.vendas).toLocaleString()}</td>
                            <td className="px-6 py-4">{formatCurrency(row.cpa)}</td>
                            <td className={`px-6 py-4 font-bold ${row.roas >= 3 ? 'text-green-500' : row.roas >= 2 ? 'text-yellow-500' : 'text-red-500'}`}>{row.roas.toFixed(2)}x</td>
                            <td className="px-6 py-4 text-center text-lg">{row.status}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {/* SALA DE GUERRA (CHAT IA) - LAYOUT CORRIGIDO */}
             <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
                 <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                     <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2"><Bot className="w-4 h-4"/> Sala de Guerra (Planejamento com IA)</h3>
                     <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Agente Ativo</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
                     {chatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-none' : 'bg-orange-900/20 text-orange-100 border border-orange-500/20 rounded-bl-none'}`}>
                                 {msg.role === 'ai' && <p className="text-[10px] font-bold text-orange-500 mb-2 uppercase tracking-wide flex items-center gap-1"><Sparkles className="w-3 h-3"/> Media Planner</p>}
                                 <div className="whitespace-pre-wrap">{msg.content}</div>
                             </div>
                         </div>
                     ))}
                     <div ref={chatEndRef}></div>
                 </div>

                 {/* ÁREA DE INTERAÇÃO (LAYOUT INPUT + BOTÃO ABAIXO) */}
                 <div className="p-4 bg-black border-t border-zinc-800 flex flex-col gap-4">
                     
                     <div className="grid grid-cols-3 gap-4">
                         <button onClick={() => setChatInput("Qual a sugestão de split de verba para ROAS 3?")} className="flex flex-col items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-3 rounded-lg border border-zinc-700 transition-all shadow hover:shadow-orange-900/20 hover:border-green-500/50 group h-20"><div className="bg-green-900/30 p-2 rounded-full group-hover:bg-green-900/50 transition-colors"><DollarSign className="w-5 h-5 text-green-400"/></div><span>Sugestão de Split</span></button>
                         <button onClick={() => setChatInput("O que acontece se eu aumentar o budget em 20%?")} className="flex flex-col items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-3 rounded-lg border border-zinc-700 transition-all shadow hover:shadow-orange-900/20 hover:border-blue-500/50 group h-20"><div className="bg-blue-900/30 p-2 rounded-full group-hover:bg-blue-900/50 transition-colors"><TrendingUp className="w-5 h-5 text-blue-400"/></div><span>Simular +20%</span></button>
                         <button onClick={() => setChatInput("Otimizar verba atual para máximo ROAS")} className="flex flex-col items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-3 rounded-lg border border-zinc-700 transition-all shadow hover:shadow-orange-900/20 hover:border-orange-500/50 group h-20"><div className="bg-orange-900/30 p-2 rounded-full group-hover:bg-orange-900/50 transition-colors"><Sparkles className="w-5 h-5 text-orange-400"/></div><span>Otimizar Verba</span></button>
                     </div>

                     <div className="flex flex-col gap-2">
                         <textarea 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:border-orange-500 focus:outline-none text-white shadow-inner resize-none min-h-[80px]" 
                            placeholder="Digite sua pergunta aqui..." 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)} 
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
                         />
                         <div className="flex justify-center">
                             <Button onClick={handleChatSubmit} className="bg-orange-600 hover:bg-orange-500 text-white px-6 font-bold">
                                <Send className="w-4 h-4 mr-2" /> Enviar
                             </Button>
                         </div>
                     </div>
                 </div>
             </div>
          </div>
        )}

        {/* --- ABA 2: FUNIL FULL --- */}
        {activeTab === 'funnel' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <section className="relative pl-8 border-l-2 border-blue-500/30">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-900 border-2 border-blue-500"></div>
                 <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2"><Eye className="w-4 h-4"/> Topo de Funil (Aquisição)</h3>
                 <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left"><thead className="bg-zinc-950 text-zinc-500 uppercase font-bold"><tr><th className="p-3">Campanha</th><th className="p-3">Canal</th><th className="p-3">Impressões</th><th className="p-3">CPM</th><th className="p-3">Viewability</th><th className="p-3 text-center">Status</th></tr></thead><tbody className="divide-y divide-zinc-800/50">{DADOS_FUNIL.topo.map((r, i) => (<tr key={i} className="hover:bg-zinc-900/50"><td className="p-3 font-medium text-white">{r.campanha}</td><td className="p-3 text-zinc-400">{r.canal}</td><td className="p-3">{r.imp.toLocaleString()}</td><td className="p-3">{formatCurrency(r.cpm)}</td><td className="p-3">{r.view}</td><td className="p-3 text-center">{r.status}</td></tr>))}</tbody></table>
                 </div>
              </section>
              <section className="relative pl-8 border-l-2 border-yellow-500/30">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-yellow-900 border-2 border-yellow-500"></div>
                 <h3 className="text-sm font-bold text-yellow-400 uppercase mb-4 flex items-center gap-2"><MousePointerClick className="w-4 h-4"/> Meio de Funil (Consideração)</h3>
                 <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left"><thead className="bg-zinc-950 text-zinc-500 uppercase font-bold"><tr><th className="p-3">Campanha</th><th className="p-3">Canal</th><th className="p-3">Sessões</th><th className="p-3">CTR</th><th className="p-3">Custo/Visita</th><th className="p-3 text-center">Status</th></tr></thead><tbody className="divide-y divide-zinc-800/50">{DADOS_FUNIL.meio.map((r, i) => (<tr key={i} className="hover:bg-zinc-900/50"><td className="p-3 font-medium text-white">{r.campanha}</td><td className="p-3 text-zinc-400">{r.canal}</td><td className="p-3">{r.sessões.toLocaleString()}</td><td className="p-3">{r.ctr}</td><td className="p-3">{formatCurrency(r.custo_visita)}</td><td className="p-3 text-center">{r.status}</td></tr>))}</tbody></table>
                 </div>
              </section>
              <section className="relative pl-8 border-l-2 border-green-500/30">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-900 border-2 border-green-500"></div>
                 <h3 className="text-sm font-bold text-green-400 uppercase mb-4 flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Fundo de Funil (Conversão)</h3>
                 <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left"><thead className="bg-zinc-950 text-zinc-500 uppercase font-bold"><tr><th className="p-3">Campanha</th><th className="p-3">Canal</th><th className="p-3">Vendas</th><th className="p-3">CPA</th><th className="p-3">ROAS</th><th className="p-3 text-center">Status</th></tr></thead><tbody className="divide-y divide-zinc-800/50">{DADOS_FUNIL.fundo.map((r, i) => (<tr key={i} className="hover:bg-zinc-900/50"><td className="p-3 font-medium text-white">{r.campanha}</td><td className="p-3 text-zinc-400">{r.canal}</td><td className="p-3 font-bold text-white">{r.vendas}</td><td className="p-3">{formatCurrency(r.cpa)}</td><td className={`p-3 font-bold ${r.roas >= 3 ? 'text-green-500' : 'text-red-500'}`}>{r.roas}x</td><td className="p-3 text-center">{r.status}</td></tr>))}</tbody></table>
                 </div>
              </section>
           </div>
        )}

        {/* --- ABA 3: CRIATIVOS --- */}
        {activeTab === 'creative' && (
           <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">{DADOS_CRIATIVOS.map((criativo, i) => (<div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition"><div className="flex justify-between items-start mb-4"><div><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${criativo.etapa === 'Topo' ? 'bg-blue-900/30 text-blue-400' : criativo.etapa === 'Meio' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'}`}>{criativo.etapa}</span><h4 className="text-sm font-bold text-white mt-2">{criativo.nome}</h4><p className="text-xs text-zinc-500">{criativo.canal}</p></div><div className="text-2xl">{criativo.status}</div></div><div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3"><div className="text-center"><p className="text-[10px] text-zinc-500 uppercase">CTR</p><p className="text-sm font-bold text-white">{criativo.ctr}</p></div><div className="text-center"><p className="text-[10px] text-zinc-500 uppercase">VTR</p><p className="text-sm font-bold text-white">{criativo.vtr}</p></div><div className="text-center"><p className="text-[10px] text-zinc-500 uppercase">CVR</p><p className="text-sm font-bold text-white">{criativo.cvr}</p></div></div></div>))}</div>
        )}

        {/* --- ABA 4: METAS (ATIVADA) --- */}
        {activeTab === 'settings' && (
           <div className="max-w-xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-zinc-400" /> Configuração de KPIs (Gatilhos)</h3>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 items-center border-b border-zinc-800 pb-4"><label className="text-sm text-zinc-300">CPM Máximo (Topo)</label><input type="number" className="bg-black border border-zinc-700 rounded p-2 text-white text-right" value={metas.topo_cpm_max} onChange={e => setMetas({...metas, topo_cpm_max: parseFloat(e.target.value)})} /></div>
                 <div className="grid grid-cols-2 gap-4 items-center border-b border-zinc-800 pb-4"><label className="text-sm text-zinc-300">Custo Visita Max (Meio)</label><input type="number" className="bg-black border border-zinc-700 rounded p-2 text-white text-right" value={metas.meio_custo_visita_max} onChange={e => setMetas({...metas, meio_custo_visita_max: parseFloat(e.target.value)})} /></div>
                 <div className="grid grid-cols-2 gap-4 items-center border-b border-zinc-800 pb-4"><label className="text-sm text-zinc-300">ROAS Mínimo (Fundo)</label><input type="number" className="bg-black border border-zinc-700 rounded p-2 text-white text-right" value={metas.fundo_roas_min} onChange={e => setMetas({...metas, fundo_roas_min: parseFloat(e.target.value)})} /></div>
                 <div className="pt-4 flex justify-end"><Button onClick={handleSaveMetas} className="bg-green-600 hover:bg-green-500">Salvar Metas</Button></div>
              </div>
           </div>
        )}

      </div>

      {/* --- MODAL DE FILTROS (ATIVADO) --- */}
      {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-[350px] shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2"><Filter className="w-5 h-5 text-zinc-400"/> Filtros de Visualização</h3>
                      <button onClick={() => setShowFilterModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">Período</label>
                          <div className="flex items-center bg-black border border-zinc-700 rounded-lg p-2 gap-2">
                              <Calendar className="w-4 h-4 text-zinc-400" />
                              <select className="bg-transparent text-sm text-white w-full outline-none" value={activeFilters.period} onChange={e => setActiveFilters({...activeFilters, period: e.target.value})}>
                                  <option>Este Mês</option>
                                  <option>Mês Passado</option>
                                  <option>Últimos 3 Meses</option>
                                  <option>Este Ano</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">Canais Ativos</label>
                          <div className="space-y-2">
                              <div className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-800" onClick={() => toggleChannelFilter('dv360')}>
                                  <div className={`w-4 h-4 rounded border ${activeFilters.channels.dv360 ? 'bg-orange-500 border-orange-500' : 'border-zinc-600'}`}></div>
                                  <span className="text-sm text-white">DV360 (Display & Video)</span>
                              </div>
                              <div className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-800" onClick={() => toggleChannelFilter('meta')}>
                                  <div className={`w-4 h-4 rounded border ${activeFilters.channels.meta ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`}></div>
                                  <span className="text-sm text-white">Meta Ads (Instagram/FB)</span>
                              </div>
                              <div className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-800" onClick={() => toggleChannelFilter('google')}>
                                  <div className={`w-4 h-4 rounded border ${activeFilters.channels.google ? 'bg-green-500 border-green-500' : 'border-zinc-600'}`}></div>
                                  <span className="text-sm text-white">Google Ads (Search/Youtube)</span>
                              </div>
                          </div>
                      </div>
                      <Button onClick={applyFilters} className="w-full bg-white text-black hover:bg-zinc-200 font-bold">Aplicar Filtros</Button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL EDITAR INVESTIMENTO */}
      {showInvestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-[400px] shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2"><Calculator className="w-5 h-5 text-orange-500"/> Ajustar Budget</h3>
                      <button onClick={() => setShowInvestModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="space-y-4">
                      {execData.map(ch => (
                          <div key={ch.id}>
                              <div className="flex justify-between mb-1">
                                  <label className="text-xs text-zinc-400 font-bold uppercase">{ch.canal}</label>
                                  <span className="text-xs text-zinc-600">Atual: {formatCurrency(ch.invest)}</span>
                              </div>
                              <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                                  <input 
                                      type="number"
                                      className="w-full bg-black border border-zinc-700 rounded-lg py-2 pl-9 pr-4 text-white focus:border-orange-500 focus:outline-none font-mono"
                                      value={tempInvest[ch.id] || ""}
                                      onChange={(e) => setTempInvest({...tempInvest, [ch.id]: e.target.value})}
                                      placeholder="0.00"
                                  />
                              </div>
                          </div>
                      ))}
                      <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                          <div className="text-right flex-1 pr-4">
                              <p className="text-[10px] text-zinc-500 uppercase">Novo Total Estimado</p>
                              <p className="text-lg font-bold text-green-400">
                                  {formatCurrency(
                                      Object.values(tempInvest)
                                          .map(v => parseFloat(v) || 0)
                                          .reduce((a,b)=>a+b,0)
                                  )}
                              </p>
                          </div>
                          <Button onClick={saveInvestments} className="bg-orange-600 hover:bg-orange-500 text-white font-bold"><Save className="w-4 h-4 mr-2"/> Aplicar</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DIAGNÓSTICO (LATERAL) */}
      {showDiagnostics && (
         <div className="fixed inset-y-0 right-0 w-[400px] bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 z-50">
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-orange-500" /> Diagnóstico IA</h3><button onClick={() => setShowDiagnostics(false)} className="text-zinc-500 hover:text-white"><AlertTriangle className="w-5 h-5" /></button></div>
            <div className="space-y-4">{diagnosticsList.length === 0 ? (<p className="text-zinc-500 text-sm">Nenhum alerta crítico.</p>) : (diagnosticsList.map((alert, idx) => (<div key={idx} className={`p-4 rounded-xl border ${alert.nivel === 'critico' ? 'bg-red-900/10 border-red-900/50' : 'bg-yellow-900/10 border-yellow-900/50'}`}><h4 className="text-sm font-bold text-white mb-1">{alert.problema}</h4><p className="text-xs text-zinc-400">{alert.solucao}</p></div>)))}</div>
         </div>
      )}

    </div>
  );
}
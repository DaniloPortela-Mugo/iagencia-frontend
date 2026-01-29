import React, { useState, useRef } from "react";
import { 
  Tv, Radio, Map, FileSpreadsheet, Upload, Send, 
  CheckCircle2, AlertTriangle, Download, Filter, 
  Bot, Sparkles, Truck, FileText, X,
  Eye, CalendarDays, Plus, BarChart3, TrendingUp, Zap,
  Calculator, Target, DollarSign, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Certifique-se de ter este componente
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Certifique-se de ter este componente
import { Badge } from "@/components/ui/badge"; // Certifique-se de ter este componente

const API_URL = "http://localhost:8000";

// --- MOCK DATA (EXISTENTE) ---
const PIS_ATIVOS = [
  { id: "PI-2026-001", veiculo: "TV Globo", programa: "Jornal Nacional", formato: "30\"", insercoes: 5, valor: 450000, status: "Aprovado", material_status: "Pendente" },
  { id: "PI-2026-002", veiculo: "JCDecaux", praca: "São Paulo - Av. Paulista", formato: "Relógio Digital", insercoes: 1400, valor: 12000, status: "Em Veiculação", material_status: "Enviado" },
  { id: "PI-2026-003", veiculo: "Rádio Mix", programa: "Mix Tudo", formato: "Spot 30\"", insercoes: 20, valor: 8500, status: "Checking", material_status: "Enviado" },
];

const MAPA_VEICULACAO = [
  { dia: "Seg 27", globo: 1, sbt: 0, radio: 4, ooh: "On" },
  { dia: "Ter 28", globo: 0, sbt: 2, radio: 4, ooh: "On" },
  { dia: "Qua 29", globo: 1, sbt: 0, radio: 4, ooh: "On" },
  { dia: "Qui 30", globo: 2, sbt: 1, radio: 4, ooh: "On" },
  { dia: "Sex 31", globo: 1, sbt: 0, radio: 6, ooh: "On" },
];

const MATERIAIS = [
  { id: 1, nome: "VarejoSA_Ofertas_30s_VFINAL.mxf", tipo: "Vídeo TV", tamanho: "1.2 GB", status: "Pronto" },
  { id: 2, nome: "VarejoSA_Spot_Radio_30s.mp3", tipo: "Áudio", tamanho: "4 MB", status: "Pronto" },
  { id: 3, nome: "OOH_Paulista_1080x1920.jpg", tipo: "Imagem", tamanho: "12 MB", status: "Aprovado" },
];

export default function MediaOffline() {
  // Adicionei 'planejamento' nas abas
  const [activeTab, setActiveTab] = useState<'planejamento' | 'mapa' | 'pis' | 'materiais' | 'checking'>('mapa');
  
  // STATE: CALCULO GRP (NOVO)
  const [grpFormData, setGrpFormData] = useState({
    budget: "",
    target: "",
    region: "nacional",
    duration: "15"
  });
  const [grpLoading, setGrpLoading] = useState(false);
  const [grpPlan, setGrpPlan] = useState<any>(null);

  // STATE: MODAIS
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);

  // STATE: CHAT IA
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', content: string}[]>([
      { role: 'ai', content: "Olá! Analisei seu mapa de veiculação. Notei que temos uma inserção no Jornal Nacional hoje. Quer que eu monitore o 'Spike' de tráfego no site durante a exibição?" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- HANDLERS EXISTENTES ---
  const handleSendMaterial = (piId: string) => {
      toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
          loading: `Conectando servidor OPEC da emissora para ${piId}...`,
          success: 'Material entregue com sucesso! Protocolo: #99283',
          error: 'Erro na conexão FTP'
      });
  };

  const handleDownloadSelection = () => {
      toast.success("Download iniciado: PIs_Selecionados.zip");
  };

  const handleExportPDF = () => {
      toast.success("Mapa Tático exportado (PDF)!");
  };

  const handleCreatePlan = () => {
      setShowNewPlanModal(false);
      setActiveTab('planejamento'); // Redireciona para a nova aba
  };

  const handleChatSubmit = () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput;
      setChatInput("");
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

      setTimeout(() => {
          let aiResponse = "";
          const lowerMsg = userMsg.toLowerCase();

          if (lowerMsg.includes("grp") || lowerMsg.includes("cobertura")) {
              aiResponse = "Considerando o target ABC 25-45 anos:\n\n📺 **TV Aberta:** 150 GRPs (Alcance 45%)\n📻 **Rádio (Drive Time):** 40 TRPs\n\nIsso nos dá uma cobertura estimada de 62% do público-alvo na praça SP.";
          } else if (lowerMsg.includes("plano") || lowerMsg.includes("sugestão")) {
              aiResponse = "Para otimizar a verba de R$ 500k, sugiro:\n\n1. **Reduzir TV Nacional** e focar em praças chave (SP/RJ/BH).\n2. **Aumentar OOH Digital** em rotas de transporte.\n3. Usar rádio apenas em horários de pico (07h-09h e 18h-19h).";
          } else {
              aiResponse = "Entendido. Estou monitorando os dados de Checking em tempo real.";
          }
          setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 1000);
  };

  // --- HANDLER NOVO: GERAR GRP ---
  const handleGenerateGRP = async () => {
    if (!grpFormData.budget || !grpFormData.target) {
      toast.warning("Informe a Verba e o Público-alvo.");
      return;
    }
    setGrpLoading(true);
    try {
      const res = await fetch(`${API_URL}/media/offline-plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grpFormData),
      });
      const data = await res.json();
      setGrpPlan(data);
      toast.success("Cálculo de GRP realizado com sucesso!");
    } catch (error) { toast.error("Erro ao conectar com a IA de Mídia."); } 
    finally { setGrpLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-black shrink-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Tv className="w-6 h-6 text-purple-500" />
            Mídia Offline & OOH
          </h1>
          
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setActiveTab('planejamento')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'planejamento' ? 'bg-purple-900/50 text-purple-200 border border-purple-500/30' : 'text-zinc-400 hover:text-white'}`}><Calculator className="w-3 h-3"/> Planejamento GRP</button>
            <div className="w-px h-4 bg-zinc-800 mx-1"></div>
            <button onClick={() => setActiveTab('mapa')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'mapa' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Mapa Tático</button>
            <button onClick={() => setActiveTab('pis')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'pis' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Gestão de PIs</button>
            <button onClick={() => setActiveTab('materiais')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'materiais' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Logística</button>
            <button onClick={() => setActiveTab('checking')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'checking' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Checking</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="outline" size="sm" onClick={() => setShowFilterModal(true)} className="border-zinc-700 text-zinc-400 hover:text-white gap-2 text-xs"><Filter className="w-3 h-3" /> Filtros</Button>
           <Button onClick={() => setShowNewPlanModal(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* --- ABA NOVA: PLANEJAMENTO GRP (INTEGRAÇÃO API) --- */}
        {activeTab === 'planejamento' && (
          <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* INPUTS DA CALCULADORA */}
            <div className="w-full lg:w-1/4 space-y-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle className="text-sm uppercase text-zinc-400 flex items-center gap-2"><Calculator className="w-4 h-4"/> Calculadora de Alcance</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-1 block text-zinc-400">Verba Total (R$)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500"/>
                        <Input type="number" className="pl-8 bg-black border-zinc-700 text-white" placeholder="500000" value={grpFormData.budget} onChange={e => setGrpFormData({...grpFormData, budget: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold mb-1 block text-zinc-400">Público-Alvo</label>
                    <div className="relative">
                        <Target className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500"/>
                        <Input className="pl-8 bg-black border-zinc-700 text-white" placeholder="Ex: Classe C, Gen Z..." value={grpFormData.target} onChange={e => setGrpFormData({...grpFormData, target: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-1 block text-zinc-400">Praça / Região</label>
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500 z-10"/>
                      <select 
                        className="w-full pl-8 bg-black border border-zinc-700 rounded-md h-9 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={grpFormData.region} 
                        onChange={e => setGrpFormData({...grpFormData, region: e.target.value})}
                      >
                          <option value="nacional">Nacional</option>
                          <option value="sp">São Paulo (Capital)</option>
                          <option value="rj">Rio de Janeiro</option>
                          <option value="sul">Região Sul</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-1 block text-zinc-400">Duração (Dias)</label>
                    <div className="relative">
                        <CalendarDays className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500"/>
                        <Input type="number" className="pl-8 bg-black border-zinc-700 text-white" value={grpFormData.duration} onChange={e => setGrpFormData({...grpFormData, duration: e.target.value})} />
                    </div>
                  </div>

                  <Button onClick={handleGenerateGRP} disabled={grpLoading} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                    {grpLoading ? "Calculando..." : "Calcular GRP & Mídia"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* OUTPUT DA CALCULADORA */}
            <div className="flex-1">
                {!grpPlan ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 p-10 text-zinc-500">
                        <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                        <p>Insira a verba e público para gerar o planejamento de GRP.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-6">
                                    <span className="text-xs text-zinc-500 uppercase font-bold">Total GRP</span>
                                    <div className="text-4xl font-bold text-white mt-2">{grpPlan.metrics.total_grp}</div>
                                    <Badge className="mt-2 bg-blue-900/20 text-blue-400 border-blue-900/50">Impacto Alto</Badge>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-6">
                                    <span className="text-xs text-zinc-500 uppercase font-bold">Alcance Estimado</span>
                                    <div className="text-4xl font-bold text-white mt-2">{grpPlan.metrics.estimated_reach}</div>
                                    <span className="text-xs text-zinc-500">do target {grpFormData.target}</span>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-6">
                                    <span className="text-xs text-zinc-500 uppercase font-bold">Frequência Média</span>
                                    <div className="text-4xl font-bold text-white mt-2">{grpPlan.metrics.frequency}x</div>
                                    <span className="text-xs text-zinc-500">Exposições por pessoa</span>
                                </CardContent>
                            </Card>
                        </div>

                        {/* STRATEGY */}
                        <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg flex gap-3 items-start">
                            <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-400 text-sm">Estratégia Recomendada pela IA</h4>
                                <p className="text-sm text-blue-200/80">{grpPlan.strategy_text}</p>
                            </div>
                        </div>

                        {/* MAPA TABLE */}
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-md font-bold text-white">Sugestão de Distribuição de Verba</CardTitle>
                                <Button variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-400"><Download className="w-4 h-4"/> Exportar Plano</Button>
                            </CardHeader>
                            <CardContent>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-black text-zinc-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Meio</th>
                                            <th className="px-4 py-3">Programa / Formato</th>
                                            <th className="px-4 py-3 text-center">Inserções</th>
                                            <th className="px-4 py-3 text-center">GRP</th>
                                            <th className="px-4 py-3 text-right">Investimento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {grpPlan.plan_items.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-zinc-800/50">
                                                <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                                                    {item.channel.includes("TV") ? <Tv className="w-4 h-4 text-purple-500"/> : 
                                                    item.channel.includes("RADIO") ? <Radio className="w-4 h-4 text-yellow-500"/> : 
                                                    <Map className="w-4 h-4 text-green-500"/>}
                                                    {item.channel}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-300">{item.program}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="outline" className="bg-zinc-950 border-zinc-700 text-white">{item.insertions}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-zinc-400">{item.grp}</td>
                                                <td className="px-4 py-3 text-right font-medium text-green-400">
                                                    {item.total_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* --- ABA 2: MAPA TÁTICO (EXISTENTE) --- */}
        {activeTab === 'mapa' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             {/* KPIs */}
             <div className="grid grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Investimento Bruto</p>
                   <h3 className="text-2xl font-bold text-white">R$ 1.2M</h3>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Negociação</p>
                   <h3 className="text-2xl font-bold text-green-400">- 85%</h3>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total GRPs</p>
                   <h3 className="text-2xl font-bold text-white">450</h3>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                   <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Alcance Estimado</p>
                   <h3 className="text-2xl font-bold text-white">12 Milhões</h3>
                </div>
             </div>

             {/* MAPA VISUAL */}
             <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-500"/> Mapa de Veiculação (Jan/2026)</h3>
                   <Button variant="ghost" size="sm" onClick={handleExportPDF} className="h-6 text-[10px] text-zinc-500"><Download className="w-3 h-3 mr-1"/> Exportar PDF</Button>
                </div>
                <table className="w-full text-center text-sm">
                   <thead className="bg-zinc-900/50 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr>
                         <th className="px-6 py-3 text-left">Dia</th>
                         <th className="px-6 py-3 text-blue-400">TV Globo (JN)</th>
                         <th className="px-6 py-3 text-green-400">SBT (Domingo)</th>
                         <th className="px-6 py-3 text-yellow-400">Rádio Mix</th>
                         <th className="px-6 py-3 text-purple-400">OOH Digital</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800">
                      {MAPA_VEICULACAO.map((row, i) => (
                         <tr key={i} className="hover:bg-zinc-900/20 transition">
                            <td className="px-6 py-4 font-bold text-zinc-300 text-left">{row.dia}</td>
                            <td className="px-6 py-4">{row.globo > 0 ? <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded font-bold border border-blue-900/50">{row.globo} ins.</span> : '-'}</td>
                            <td className="px-6 py-4">{row.sbt > 0 ? <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded font-bold border border-green-900/50">{row.sbt} ins.</span> : '-'}</td>
                            <td className="px-6 py-4">{row.radio > 0 ? <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded font-bold border border-yellow-900/50">{row.radio} spots</span> : '-'}</td>
                            <td className="px-6 py-4"><span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded font-bold border border-purple-900/50">{row.ooh}</span></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {/* IDEIA GENIAL: TV ATTRIBUTION PULSE */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 
                 {/* GRÁFICO DE PICO */}
                 <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500"/> O Pulso da TV (TV Attribution)</h3>
                        <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">Live</span>
                    </div>
                    <div className="flex-1 relative h-40 w-full flex items-end px-2 border-b border-zinc-700/50 pb-2">
                        {/* Linhas de grade */}
                        <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-zinc-600 pointer-events-none pb-2">
                             <div className="border-b border-zinc-800/50 w-full h-full"></div>
                             <div className="border-b border-zinc-800/50 w-full h-full"></div>
                        </div>
                        {/* O PICO (SVG) */}
                        <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <defs><linearGradient id="gradPulse" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#eab308" stopOpacity="0.5" /><stop offset="100%" stopColor="#eab308" stopOpacity="0" /></linearGradient></defs>
                            {/* Linha base */}
                            <path d="M0,45 L20,43 L40,44 L45,10 L50,42 L60,44 L80,43 L100,45 Z" fill="url(#gradPulse)" />
                            <polyline points="0,45 20,43 40,44 45,10 50,42 60,44 80,43 100,45" fill="none" stroke="#eab308" strokeWidth="1" />
                        </svg>
                        {/* Marcador do Comercial */}
                        <div className="absolute left-[45%] top-0 bottom-0 border-l border-dashed border-white opacity-50 flex flex-col items-center">
                            <div className="bg-white text-black text-[8px] font-bold px-1 rounded mt-2">JN (20:30)</div>
                        </div>
                        <div className="absolute left-[45%] bottom-10 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                            +42% Acessos
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Pico de tráfego detectado no site 2 minutos após a inserção na TV Globo.</p>
                 </div>

                 {/* CHAT IA (AGORA INTEGRADO) */}
                 <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col h-[250px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-purple-300 flex items-center gap-2"><Bot className="w-4 h-4"/> Estrategista Offline</h3>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-black/20">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-zinc-700 text-white' : 'bg-purple-900/20 text-purple-100 border border-purple-500/20'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef}></div>
                    </div>
                    <div className="p-3 bg-black border-t border-zinc-800 relative">
                        <input 
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-500" 
                            placeholder="Pergunte à IA..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                        />
                        <button onClick={handleChatSubmit} className="absolute right-5 top-4 text-zinc-400 hover:text-purple-400"><Send className="w-4 h-4"/></button>
                    </div>
                 </div>

             </div>
          </div>
        )}

        {/* --- ABA 3: PIS (EXISTENTE) --- */}
        {activeTab === 'pis' && (
           <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold text-white">Pedidos de Inserção (PIs)</h3>
                  <Button variant="outline" onClick={handleDownloadSelection} className="border-zinc-700 text-zinc-300 hover:text-white"><Download className="w-4 h-4 mr-2"/> Baixar Selecionados</Button>
              </div>
              <div className="grid gap-4">
                  {PIS_ATIVOS.map((pi) => (
                      <div key={pi.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-600 transition group">
                          <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-zinc-800 rounded flex items-center justify-center">
                                  {pi.veiculo.includes('TV') ? <Tv className="w-5 h-5 text-zinc-400"/> : pi.veiculo.includes('Rádio') ? <Radio className="w-5 h-5 text-zinc-400"/> : <Map className="w-5 h-5 text-zinc-400"/>}
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-white text-sm">{pi.id} | {pi.veiculo}</h4>
                                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${pi.status === 'Aprovado' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>{pi.status}</span>
                                  </div>
                                  <p className="text-xs text-zinc-500">{pi.programa || pi.praca} • {pi.formato} • {pi.insercoes} inserções</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-6">
                              <div className="text-right"><p className="text-xs text-zinc-500 uppercase">Valor Líquido</p><p className="font-mono font-bold text-white">R$ {pi.valor.toLocaleString()}</p></div>
                              <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white"><Eye className="w-4 h-4"/></Button>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {/* --- ABA 4: MATERIAIS (EXISTENTE) --- */}
        {activeTab === 'materiais' && (
           <div className="grid grid-cols-12 gap-6 animate-in fade-in">
              <div className="col-span-8 space-y-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                      <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-purple-500"/> Central de Upload (OPEC)</h3>
                      <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:bg-zinc-900/50 transition cursor-pointer">
                          <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3"><Upload className="w-6 h-6 text-zinc-400"/></div>
                          <p className="text-sm text-zinc-300 font-bold">Arraste arquivos .MXF, .MOV ou .MP3</p>
                          <p className="text-xs text-zinc-500">Protocolo S1 (Globo) e Adstream integrados.</p>
                      </div>
                  </div>
                  {MATERIAIS.map((mat) => (
                      <div key={mat.id} className="bg-black border border-zinc-800 p-3 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-zinc-900 rounded"><FileText className="w-4 h-4 text-zinc-300"/></div>
                              <div><p className="text-xs font-bold text-white">{mat.nome}</p><p className="text-[10px] text-zinc-500">{mat.tipo} • {mat.tamanho}</p></div>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] border-zinc-700">Pré-visualizar</Button>
                      </div>
                  ))}
              </div>
              <div className="col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-fit">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-green-500"/> Disparo para Emissoras</h3>
                  <div className="space-y-4">
                      {PIS_ATIVOS.filter(pi => pi.material_status !== 'Enviado').map((pi) => (
                          <div key={pi.id} className="p-3 bg-black rounded border border-zinc-700">
                              <div className="flex justify-between mb-2"><span className="text-xs font-bold text-zinc-300">{pi.veiculo}</span><span className="text-[10px] text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded">Material Pendente</span></div>
                              <p className="text-[10px] text-zinc-500 mb-3">{pi.programa} - PI {pi.id}</p>
                              <div className="relative"><select className="w-full bg-zinc-800 border border-zinc-700 text-xs text-white p-2 rounded mb-2"><option>Selecione o material...</option>{MATERIAIS.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select><Button onClick={() => handleSendMaterial(pi.id)} className="w-full bg-green-600 hover:bg-green-500 h-8 text-xs font-bold"><Send className="w-3 h-3 mr-2"/> Enviar via OPEC</Button></div>
                          </div>
                      ))}
                      {PIS_ATIVOS.filter(pi => pi.material_status !== 'Enviado').length === 0 && <div className="text-center py-8 text-zinc-500 text-xs"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50"/>Todos os materiais foram entregues!</div>}
                  </div>
              </div>
           </div>
        )}
        
        {/* --- ABA 5: CHECKING (EXISTENTE) --- */}
        {activeTab === 'checking' && (
            <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-600 transition cursor-pointer">
                        <div className="h-32 bg-zinc-800 flex items-center justify-center relative"><img src={`https://source.unsplash.com/random/400x300?billboard&sig=${i}`} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition" alt="Checking" /><div className="absolute top-2 right-2 bg-black/70 text-white text-[9px] px-2 py-1 rounded backdrop-blur-sm">OOH</div></div>
                        <div className="p-3"><h4 className="text-xs font-bold text-white mb-1">Foto Comprovante #{i}</h4><p className="text-[10px] text-zinc-500 flex items-center gap-1"><Map className="w-3 h-3"/> Av. Paulista, 1000 - Face Norte</p></div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* MODAL FILTROS */}
      {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-[350px]">
                  <h3 className="text-lg font-bold text-white mb-4">Filtrar Mapa</h3>
                  <div className="space-y-4">
                      <div className="flex flex-col gap-2"><label className="text-xs text-zinc-400">Veículo</label><select className="bg-black border border-zinc-700 rounded p-2 text-sm text-white"><option>Todos</option><option>Globo</option><option>SBT</option></select></div>
                      <div className="flex flex-col gap-2"><label className="text-xs text-zinc-400">Período</label><select className="bg-black border border-zinc-700 rounded p-2 text-sm text-white"><option>Este Mês</option><option>Próximo Mês</option></select></div>
                      <div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setShowFilterModal(false)} className="flex-1">Cancelar</Button><Button onClick={() => setShowFilterModal(false)} className="flex-1 bg-purple-600">Aplicar</Button></div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL NOVO PLANO (ATUALIZADO) */}
      {showNewPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-[400px]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500"/> Criar Plano de Mídia</h3>
                  <p className="text-xs text-zinc-400 mb-4">A IA vai sugerir o mix ideal baseado no budget.</p>
                  <div className="space-y-4">
                      {/* Ao clicar em gerar plano, agora ele redireciona para a aba correta */}
                      <div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setShowNewPlanModal(false)} className="flex-1">Cancelar</Button><Button onClick={handleCreatePlan} className="flex-1 bg-purple-600">Ir para Calculadora</Button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
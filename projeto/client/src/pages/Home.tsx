import React, { useEffect, useState } from "react";
import { 
  Activity, Users, Megaphone, CheckCircle2, 
  AlertTriangle, Clock, TrendingUp, Calendar, 
  ArrowRight, Layout, PenTool, Layers, DollarSign,
  MoreHorizontal, BarChart3, Timer, Zap, Database, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase"; // Import do Supabase

// --- MOCK DATA (Mantidos para as outras seções) ---

const ALERTS = [
  { id: 1, type: "media", text: "ROAS do Meta caiu para 1.99 (Meta: 3.0)", action: "Otimizar Mídia", link: "/media" },
  { id: 2, type: "approval", text: "Campanha 'Dia dos Pais' aguardando cliente há 24h", action: "Cobrar Cliente", link: "/approvals" },
  { id: 3, type: "deadline", text: "3 Jobs de Redação vencem hoje", action: "Ver Kanban", link: "/creation/copy" },
];

const ACTIVE_JOBS = [
  { id: 1, client: "Varejo S.A.", title: "Roteiro TV - Ofertas", sector: "Redação", status: "Em Andamento", user: "Julia" },
  { id: 2, client: "Moda Fashion", title: "KVs Verão 2026", sector: "Dir. Arte", status: "Revisão", user: "Marcos" },
  { id: 3, client: "Burger King", title: "Planejamento Q3", sector: "Planning", status: "Briefing", user: "Ana" },
  { id: 4, client: "Tech Sol.", title: "Post Blog Tech", sector: "Redação", status: "Fila", user: "Julia" },
];

const TEAM_METRICS = [
    { id: 1, name: "Julia", role: "Redação", load: 95, logged_hours: 7.5, total_capacity: 8, tasks_done: 12 },
    { id: 2, name: "Marcos", role: "Dir. Arte", load: 60, logged_hours: 4.2, total_capacity: 8, tasks_done: 5 },
    { id: 3, name: "Ana", role: "Planning", load: 85, logged_hours: 6.0, total_capacity: 8, tasks_done: 8 },
    { id: 4, name: "Carlos", role: "Mídia", load: 40, logged_hours: 2.5, total_capacity: 8, tasks_done: 3 },
];

export default function Home() {
  const [location, setLocation] = useLocation();
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(true);

  // BUSCA CLIENTES E CRÉDITOS NO SUPABASE
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, api_credits')
          .order('api_credits', { ascending: true }); // Mostra quem tem menos crédito primeiro (Risco)

        if (data) setClientsData(data);
      } catch (e) {
        console.error("Erro ao buscar créditos", e);
      } finally {
        setLoadingCredits(false);
      }
    };
    fetchCredits();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-black z-10">
        <div>
          <h1 className="text-xl font-bold text-white">War Room <span className="text-zinc-600 text-sm font-normal">| Visão Geral</span></h1>
          <p className="text-xs text-zinc-500">Gestão Executiva & Monitoramento SaaS</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-zinc-400 font-bold uppercase">Online</span>
           </div>
           <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">D</div>
        </div>
      </header>

      {/* CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* --- SESSÃO 1: KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><DollarSign className="w-12 h-12 text-green-500" /></div>
              <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Receita Recorrente (MRR)</p>
              <h3 className="text-3xl font-bold text-white">R$ 142k</h3>
              <p className="text-[10px] text-green-500 flex items-center gap-1 mt-2"><TrendingUp className="w-3 h-3" /> +12% vs mês anterior</p>
           </div>
           <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Zap className="w-12 h-12 text-yellow-500" /></div>
              <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Consumo de IA (Tokens)</p>
              <h3 className="text-3xl font-bold text-white">8.4M</h3>
              <p className="text-[10px] text-yellow-500 flex items-center gap-1 mt-2"><Activity className="w-3 h-3" /> Alta demanda hoje</p>
           </div>
           <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><CheckCircle2 className="w-12 h-12 text-blue-500" /></div>
              <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Jobs Entregues (Mês)</p>
              <h3 className="text-3xl font-bold text-white">128</h3>
              <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-2"><Clock className="w-3 h-3" /> 98% no prazo</p>
           </div>
           <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Users className="w-12 h-12 text-purple-500" /></div>
              <p className="text-xs text-zinc-500 font-bold uppercase mb-1">Capacidade do Time</p>
              <h3 className="text-3xl font-bold text-white">72%</h3>
              <p className="text-[10px] text-purple-400 flex items-center gap-1 mt-2">Equipe operando bem</p>
           </div>
        </div>

        {/* --- SESSÃO 2: MONITORA DE CRÉDITOS (SaaS VIEW) - NOVO! --- */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4" /> Monitoramento de Créditos & API (SaaS)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* LISTA DINÂMICA DO SUPABASE */}
                {loadingCredits ? (
                    <div className="text-zinc-500 text-xs">Carregando saldos...</div>
                ) : (
                    clientsData.map((client) => {
                        // Lógica de Cor baseada no saldo
                        const credits = client.api_credits || 0;
                        const isLow = credits < 200;
                        const isCritical = credits < 50;
                        const statusColor = isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500';
                        const textColor = isCritical ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-green-500';
                        const borderColor = isCritical ? 'border-red-900/50' : 'border-zinc-800';

                        return (
                            <div key={client.id} className={`bg-zinc-900/40 border ${borderColor} p-4 rounded-xl flex flex-col justify-between hover:bg-zinc-900 transition`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white text-sm truncate pr-2">{client.name}</h4>
                                    <div className={`${textColor} bg-zinc-950 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-800 uppercase`}>
                                        {isCritical ? 'Crítico' : 'Ativo'}
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-zinc-400">
                                        <span>Saldo de API</span>
                                        <span className={`font-mono font-bold ${textColor}`}>{credits}</span>
                                    </div>
                                    <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-zinc-800">
                                        <div 
                                            className={`h-full rounded-full ${statusColor}`} 
                                            style={{ width: `${Math.min((credits / 1000) * 100, 100)}%` }} // Assume 1000 como base visual
                                        ></div>
                                    </div>
                                </div>

                                {isCritical && (
                                    <Button variant="ghost" size="sm" className="mt-3 w-full h-6 text-[10px] bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-white">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> Notificar Recarga
                                    </Button>
                                )}
                            </div>
                        )
                    })
                )}

                {/* Card de "Upsell" Fictício para preencher se tiver poucos clientes */}
                <div className="bg-black border border-dashed border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-zinc-500">
                    <CreditCard className="w-6 h-6 mb-2 opacity-50"/>
                    <p className="text-xs">Previsão de Receita Extra</p>
                    <p className="text-sm font-bold text-zinc-400">R$ 12.500,00</p>
                </div>
            </div>
        </div>

        {/* --- SESSÃO 3: WIDGETS OPERACIONAIS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 lg:h-[400px]">
           
           {/* ESQUERDA: ALERTAS */}
           <div className="lg:col-span-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500"/> Atenção Necessária</h3>
                 <span className="bg-red-900/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold">{ALERTS.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                 {ALERTS.map((alert) => (
                    <div 
                        key={alert.id} 
                        className="bg-black border border-zinc-800 p-4 rounded-xl group hover:border-zinc-600 transition cursor-pointer"
                        onClick={() => setLocation(alert.link)}
                    >
                       <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${alert.type === 'media' ? 'bg-orange-900/30 text-orange-400' : alert.type === 'approval' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-blue-900/30 text-blue-400'}`}>{alert.type}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-white transition" />
                       </div>
                       <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-3">{alert.text}</p>
                       <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-zinc-700 hover:bg-zinc-800 hover:text-white">{alert.action}</Button>
                    </div>
                 ))}
              </div>
           </div>

           {/* CENTRO: GRÁFICO (SVG) */}
           <div className="lg:col-span-5 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-green-500"/> Saúde Financeira</h3>
                    <p className="text-[10px] text-zinc-500">Lucro vs. Custo Operacional (7 dias)</p>
                 </div>
                 <div className="flex gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-zinc-400"><div className="w-2 h-2 rounded-full bg-green-500"></div> Lucro</span>
                    <span className="flex items-center gap-1 text-zinc-400"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Custo</span>
                 </div>
              </div>
              <div className="flex-1 w-full relative flex items-end px-2 pb-6">
                 <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-zinc-600 pointer-events-none pb-6">
                    <div className="border-b border-zinc-800/50 w-full h-full"></div>
                    <div className="border-b border-zinc-800/50 w-full h-full"></div>
                    <div className="border-b border-zinc-800/50 w-full h-full"></div>
                    <div className="border-b border-zinc-800/50 w-full h-full"></div>
                 </div>
                 <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none"><defs><linearGradient id="gradGreen" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient></defs><path d="M0,50 L0,30 L16,25 L32,35 L48,20 L64,28 L80,15 L100,5 L100,50 Z" fill="url(#gradGreen)" /><polyline points="0,30 16,25 32,35 48,20 64,28 80,15 100,5" fill="none" stroke="#22c55e" strokeWidth="0.5" /></svg>
                 <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none"><defs><linearGradient id="gradBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs><path d="M0,50 L0,45 L16,42 L32,44 L48,40 L64,41 L80,38 L100,35 L100,50 Z" fill="url(#gradBlue)" /><polyline points="0,45 16,42 32,44 48,40 64,41 80,38 100,35" fill="none" stroke="#2563eb" strokeWidth="0.5" /></svg>
                 <div className="absolute bottom-0 w-full flex justify-between text-[9px] text-zinc-500 uppercase px-1"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div>
              </div>
           </div>

           {/* DIREITA: EM PRODUÇÃO */}
           <div className="lg:col-span-3 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-white flex items-center gap-2"><Layout className="w-4 h-4 text-purple-500"/> Em Produção</h3>
                 <MoreHorizontal className="w-4 h-4 text-zinc-600 cursor-pointer hover:text-white" />
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                 {ACTIVE_JOBS.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition border border-transparent hover:border-zinc-800 group cursor-pointer" onClick={() => setLocation('/creation/copy')}>
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${job.sector === 'Redação' ? 'bg-blue-600' : job.sector === 'Dir. Arte' ? 'bg-purple-600' : 'bg-yellow-600'}`}>{job.sector.charAt(0)}</div>
                       <div className="min-w-0 flex-1"><h4 className="text-xs font-bold text-white truncate">{job.title}</h4><p className="text-[10px] text-zinc-500 truncate">{job.client} • {job.user}</p></div>
                       <div className="text-[9px] font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded group-hover:text-zinc-300 transition">{job.status}</div>
                    </div>
                 ))}
                 <button className="w-full py-2 text-[10px] text-zinc-500 border border-dashed border-zinc-800 rounded hover:text-white hover:border-zinc-600 transition" onClick={() => setLocation('/creation/da')}>+ Ver Kanban</button>
              </div>
           </div>
        </div>

        {/* --- SESSÃO 4: ACESSO RÁPIDO --- */}
        <div className="mb-8">
           <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest">Acesso Rápido aos Módulos</h3>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-zinc-800 bg-black hover:bg-zinc-900 hover:border-blue-500/50 transition group" onClick={() => setLocation('/atendimento')}>
                 <Megaphone className="w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition" /><span className="text-xs font-bold text-zinc-300">Atendimento</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-zinc-800 bg-black hover:bg-zinc-900 hover:border-yellow-500/50 transition group" onClick={() => setLocation('/planning')}>
                 <Calendar className="w-6 h-6 text-zinc-400 group-hover:text-yellow-500 transition" /><span className="text-xs font-bold text-zinc-300">Planejamento</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-zinc-800 bg-black hover:bg-zinc-900 hover:border-purple-500/50 transition group" onClick={() => setLocation('/creation/da')}>
                 <PenTool className="w-6 h-6 text-zinc-400 group-hover:text-purple-500 transition" /><span className="text-xs font-bold text-zinc-300">Criação (DA)</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-zinc-800 bg-black hover:bg-zinc-900 hover:border-orange-500/50 transition group" onClick={() => setLocation('/media-offline')}>
                 <Layers className="w-6 h-6 text-zinc-400 group-hover:text-orange-500 transition" /><span className="text-xs font-bold text-zinc-300">Mídia Offline</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-zinc-800 bg-black hover:bg-zinc-900 hover:border-green-500/50 transition group" onClick={() => setLocation('/production')}>
                 <CheckCircle2 className="w-6 h-6 text-zinc-400 group-hover:text-green-500 transition" /><span className="text-xs font-bold text-zinc-300">Produção</span>
              </Button>
           </div>
        </div>

        {/* --- SESSÃO 5: PRODUTIVIDADE --- */}
        <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Gestão de Capacidade & Timesheet
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {TEAM_METRICS.map(member => (
                    <div key={member.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${member.load > 90 ? 'bg-red-600' : member.load > 70 ? 'bg-yellow-600' : 'bg-green-600'}`}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">{member.name}</h4>
                                    <p className="text-[10px] text-zinc-500">{member.role}</p>
                                </div>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold ${member.load > 90 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                {member.load > 90 ? 'Sobrecarregado' : 'Normal'}
                            </span>
                        </div>
                        <div className="mb-4">
                            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                                <span>Ocupação</span>
                                <span>{member.load}%</span>
                            </div>
                            <div className="w-full bg-black h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${member.load > 90 ? 'bg-red-500' : member.load > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${member.load}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <div className="bg-black rounded-lg p-2 border border-zinc-800">
                                <p className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><Timer className="w-3 h-3"/> Horas Hoje</p>
                                <p className="text-sm font-bold text-white mt-1">{member.logged_hours} <span className="text-zinc-600 text-[10px]">/ {member.total_capacity}h</span></p>
                            </div>
                            <div className="bg-black rounded-lg p-2 border border-zinc-800">
                                <p className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Entregas</p>
                                <p className="text-sm font-bold text-white mt-1">{member.tasks_done} <span className="text-zinc-600 text-[10px]">tasks</span></p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
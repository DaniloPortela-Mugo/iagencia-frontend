import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Tv, Radio, Map, FileSpreadsheet, Upload, Send, 
  CheckCircle2, AlertTriangle, Download, Filter, 
  Bot, Sparkles, FileText, X,
  Eye, CalendarDays, Plus, BarChart3, TrendingUp, Zap,
  Calculator, Target, DollarSign, MapPin, Layout, ChevronUp, ChevronDown, Clock, Trash2, Edit3, User, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// IMPORTAÇÕES VITAIS
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { KanbanBoard } from "../components/KanbanBoard";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";

// --- CONFIGURAÇÕES KANBAN ---
const EQUIPE = [
  { id: "rodrigo", label: "Rodrigo (Mídia)", role: "Offline", photoUrl: "/equipe/rodrigo.jpg" },
  { id: "julia", label: "Julia (Atendimento)", role: "Plan", photoUrl: "/equipe/julia.jpg" },
];

const TASK_FORMATS = ["TV Aberta", "Rádio", "Out of Home (OOH)", "Jornal/Revista"];

const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Material p/ PI', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Reserva de Praça', color: 'bg-blue-500' },
    { id: 'review', label: 'Checking / Veiculando', color: 'bg-orange-500' },
    { id: 'done', label: 'PI Faturado', color: 'bg-green-500' }
];

// --- MOCK DATA ---
const PIS_ATIVOS = [
  { id: "PI-2026-001", veiculo: "TV Globo", programa: "Jornal Nacional", formato: "30\"", insercoes: 5, valor: 450000, status: "Aprovado" },
  { id: "PI-2026-002", veiculo: "JCDecaux", praca: "Av. Paulista", formato: "Relógio Digital", insercoes: 1400, valor: 12000, status: "Em Veiculação" },
];

const MAPA_VEICULACAO = [
  { dia: "Seg 27", globo: 1, sbt: 0, radio: 4, ooh: "On" },
  { dia: "Ter 28", globo: 0, sbt: 2, radio: 4, ooh: "On" },
  { dia: "Qua 29", globo: 1, sbt: 0, radio: 4, ooh: "On" },
];

export default function MediaOffline() {
  const { activeTenant, user } = useAuth();
  const editorName = user?.name || "Sistema";
  const [activeTab, setActiveTab] = useState<'planejamento' | 'mapa' | 'pis' | 'checking'>('mapa');
  
  // --- STATES KANBAN ---
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState({ title: "", description: "", formats: [] as string[], status: "todo", assignees: [] as string[] });

  // --- STATE PLANEJAMENTO ---
  const [planFormData, setPlanFormData] = useState({ budget: "", target: "", region: "nacional", duration: "30" });
  const [isPlanning, setIsPlanning] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  // --- STATE CHAT ---
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'ai' | 'user', content: string}[]>([
      { role: 'ai', content: "Olá! Sou seu estrategista Offline. Como podemos distribuir a verba de OOH e TV?" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // === FETCH DO SUPABASE ===
  const fetchTasks = async () => {
      let query = supabase.from('tasks').select('*').eq('department', 'mediaoff');
      if (activeTenant && activeTenant !== "all") {
        query = query.eq('tenant', activeTenant);
      }
      const { data } = await query;
      if (data) setTasks(data);
  };

  useEffect(() => {
      fetchTasks();
      const channel = supabase
        .channel(`realtime:mediaoff_tasks:${activeTenant || "all"}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: "department=eq.mediaoff" }, () => { fetchTasks(); toast.info("Novo material para Mídia Offline!"); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: "department=eq.mediaoff" }, () => { fetchTasks(); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter: "department=eq.mediaoff" }, () => { fetchTasks(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); }
  }, [activeTenant]);

  const filteredTasks = useMemo(() => {
      if (!activeTenant || activeTenant === "all") return tasks;
      return tasks.filter(t => t.tenant === activeTenant);
  }, [tasks, activeTenant]);

  // --- KANBAN HANDLERS ---
  const handleDrop = async (taskId: number, status: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      await updateTaskStatus(taskId, status, editorName);
      await fetchTasks();
  };

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return toast.error("Selecione um cliente antes de criar um job.");
    const payload = { tenant: safeTenant, department: 'mediaoff',
      updated_by: editorName, ...newTaskData, due_date: "Em breve" };
    if (editingTaskId) await supabase.from('tasks').update(payload).eq('id', editingTaskId);
    else await supabase.from('tasks').insert([payload]);
    fetchTasks(); setShowTaskModal(false); setEditingTaskId(null);
  };

  const handleOpenEditTask = (task: any) => {
    setNewTaskData({
      title: task.title || "",
      description: task.description || "",
      formats: task.formats || [],
      status: task.status || "todo",
      assignees: task.assignees || [],
    });
    setEditingTaskId(task.id);
    setShowTaskModal(true);
  };

  // --- PLANEJAMENTO IA ---
  const handleGeneratePlan = async () => {
    if (!planFormData.budget || !planFormData.target) return toast.warning("Preencha verba e público.");
    setIsPlanning(true);
    try {
      const res = await fetch(`${API_URL}/media/offline-plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planFormData),
      });
      const data = await res.json();
      setGeneratedPlan(data);
      toast.success("Plano de alcance gerado!");
    } catch (error) { 
        toast.error("IA Offline. Usando estimativa base.");
        setGeneratedPlan({ 
            reach: "45%", impact: "Alto", 
            items: [{ meio: "TV Globo", invest: planFormData.budget }] 
        });
    } finally { setIsPlanning(false); }
  };

  const handleChatSubmit = () => {
      if (!chatInput.trim()) return;
      const msg = chatInput; setChatInput("");
      setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
      // Lógica de chamada API similar às outras páginas aqui...
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-black shrink-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Tv className="w-6 h-6 text-purple-500" /> Mídia Offline
          </h1>
          
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button onClick={() => setActiveTab('mapa')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'mapa' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Mapa de Veiculação</button>
            <button onClick={() => setActiveTab('planejamento')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'planejamento' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Simulador de Alcance</button>
            <button onClick={() => setActiveTab('pis')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'pis' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>PIs & Contratos</button>
            <button onClick={() => setActiveTab('checking')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'checking' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Checking</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} variant="outline" size="sm" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white gap-2 text-xs">
                <Layout className="w-3 h-3" /> {isKanbanExpanded ? "Recolher Kanban" : "Ver Kanban"}
           </Button>
           <Button onClick={() => setActiveTab('planejamento')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
        </div>
      </header>

      {/* KANBAN UNIVERSAL */}
      <KanbanBoard 
            isExpanded={isKanbanExpanded}
            onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
            tasks={filteredTasks}
            activeTask={activeTask}
            onTaskSelect={setActiveTask}
            onTaskDelete={(id) => supabase.from('tasks').delete().eq('id', id).then(() => fetchTasks())}
            onTaskDrop={handleDrop}
            onTaskEdit={handleOpenEditTask}
            onNewTaskClick={(status) => {
              setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] });
              setEditingTaskId(null);
              setShowTaskModal(true);
            }}
      />

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* ABA: MAPA TÁTICO */}
        {activeTab === 'mapa' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="grid grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 p-4"><p className="text-xs text-zinc-500 uppercase font-bold">Investimento Offline</p><h3 className="text-2xl font-bold text-white">R$ 1.250.000</h3></Card>
                <Card className="bg-zinc-900 border-zinc-800 p-4"><p className="text-xs text-zinc-500 uppercase font-bold">Praças Ativas</p><h3 className="text-2xl font-bold text-blue-400">12 Cidades</h3></Card>
                <Card className="bg-zinc-900 border-zinc-800 p-4"><p className="text-xs text-zinc-500 uppercase font-bold">Alcance Estimado</p><h3 className="text-2xl font-bold text-green-400">18M Pessoas</h3></Card>
             </div>

             <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-500"/> Mapa de Veiculação</h3>
                   <Button variant="outline" size="sm" className="h-7 text-[10px] border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"><Download className="w-3 h-3 mr-1"/> Baixar PDF</Button>
                </div>
                <table className="w-full text-center text-sm">
                   <thead className="bg-zinc-900/50 text-zinc-500 font-bold uppercase text-[10px]">
                      <tr><th className="px-6 py-3 text-left">Dia</th><th className="px-6 py-3">TV Globo</th><th className="px-6 py-3">SBT</th><th className="px-6 py-3">Rádio Mix</th><th className="px-6 py-3">OOH Digital</th></tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-800">
                      {MAPA_VEICULACAO.map((row, i) => (
                         <tr key={i} className="hover:bg-zinc-900/20 transition">
                            <td className="px-6 py-4 font-bold text-zinc-300 text-left">{row.dia}</td>
                            <td className="px-6 py-4">{row.globo} ins.</td>
                            <td className="px-6 py-4">{row.sbt} ins.</td>
                            <td className="px-6 py-4">{row.radio} spots</td>
                            <td className="px-6 py-4"><Badge className="bg-purple-900/40 text-purple-300">{row.ooh}</Badge></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* ABA: SIMULADOR (PLANEJAMENTO) */}
        {activeTab === 'planejamento' && (
            <div className="flex gap-6 animate-in slide-in-from-bottom-4">
                <Card className="w-80 bg-zinc-900 border-zinc-800 h-fit">
                    <CardHeader className="border-b border-zinc-800"><CardTitle className="text-sm flex items-center gap-2"><Calculator className="w-4 h-4"/> Planejar Alcance</CardTitle></CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Verba Disponível</label><Input className="bg-black border-zinc-700 text-white" type="number" value={planFormData.budget} onChange={e => setPlanFormData({...planFormData, budget: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Público Alvo</label><Input className="bg-black border-zinc-700 text-white" placeholder="Ex: Mulheres 30+" value={planFormData.target} onChange={e => setPlanFormData({...planFormData, target: e.target.value})} /></div>
                        <Button onClick={handleGeneratePlan} disabled={isPlanning} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold">{isPlanning ? "Calculando..." : "Simular Mix de Mídia"}</Button>
                    </CardContent>
                </Card>

                <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center">
                    {!generatedPlan ? (
                        <div className="text-center text-zinc-600"><BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20"/><p>Insira os dados para simular o alcance da campanha offline.</p></div>
                    ) : (
                        <div className="w-full space-y-6">
                            <h3 className="text-xl font-bold">Resultado da Projeção</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black p-4 rounded-lg border border-zinc-800"><p className="text-xs text-zinc-500">Alcance no Target</p><p className="text-3xl font-bold text-green-400">{generatedPlan.reach}</p></div>
                                <div className="bg-black p-4 rounded-lg border border-zinc-800"><p className="text-xs text-zinc-500">Impacto Estimado</p><p className="text-3xl font-bold text-blue-400">{generatedPlan.impact}</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* CHAT IA (CORRIGIDO) */}
        <div className="mt-8 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col h-[300px] overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-2"><Bot className="w-4 h-4"/> Estrategista de Mídia Offline</h3>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-black/20 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-zinc-700 text-white' : 'bg-purple-900/20 text-purple-100 border border-purple-500/20'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-3 bg-black border-t border-zinc-800 relative">
                {/* ✅ TEXT-WHITE ADICIONADO PARA CORRIGIR COR DA FONTE */}
                <input 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-500" 
                    placeholder="Pergunte sobre cobertura, praças ou veículos..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <button onClick={handleChatSubmit} className="absolute right-5 top-4 text-zinc-400 hover:text-purple-400"><Send className="w-4 h-4"/></button>
            </div>
        </div>
      </div>

      {/* MODAL TAREFA (CRIAR/EDITAR) */}
      {showTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#18181b] border border-zinc-800 p-8 rounded-2xl w-[500px] shadow-2xl">
                <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2"><Plus className="w-5 h-5 text-purple-500" /> {editingTaskId ? "Editar Campanha Offline" : "Novo Planejamento"}</h3>
                <div className="space-y-5">
                <div><label className="text-xs text-zinc-400 mb-1 block">Título da Campanha *</label><input autoFocus className="w-full bg-black border border-purple-500 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" value={newTaskData.title} onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })} /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Detalhes / Veículos</label><textarea className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 focus:outline-none min-h-[100px] resize-none" value={newTaskData.description} onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })} /></div>
                <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Meios</label>
                    <div className="flex flex-wrap gap-2">
                    {TASK_FORMATS.map((f) => (
                        <button key={f} onClick={() => setNewTaskData(prev => ({...prev, formats: prev.formats.includes(f) ? prev.formats.filter(x => x !== f) : [...prev.formats, f]}))} className={`text-xs border px-3 py-1.5 rounded-md transition ${newTaskData.formats.includes(f) ? "bg-purple-600 border-purple-500 text-white" : "bg-black border-zinc-800 text-zinc-400"}`}>{f}</button>
                    ))}
                    </div>
                </div>
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-zinc-800/50">
                <Button variant="ghost" className="text-white font-bold hover:bg-zinc-800" onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }}>Cancelar</Button>
                <Button onClick={handleSaveTask} className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-6">Salvar</Button>
                </div>
            </div>
            </div>
        )}
    </div>
  );
}

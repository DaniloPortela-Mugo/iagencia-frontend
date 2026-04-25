import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  CalendarDays, Target, Lightbulb, 
  Plus, BrainCircuit, CheckCircle2,
  Layout, ChevronUp, ChevronDown, 
  Edit3, FileText, ArrowRight, Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Bot, Send } from "lucide-react";

// IMPORTAÇÕES VITAIS
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { KanbanBoard } from "../components/KanbanBoard";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const PLANNING_AGENT_URL =
  import.meta.env.VITE_PLANNING_AGENT_URL?.trim() || `${API_URL}/planning/agent`;
const PLANNING_CHAT_URL =
    import.meta.env.VITE_PLANNING_CHAT_URL?.trim() || `${API_URL}/planning/chat`;

const getAuthHeaders = async (extra?: Record<string, string>) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// --- DADOS E CONSTANTES ---
const EQUIPE = [
  { id: "julia", label: "Julia", role: "Plan", photoUrl: "/equipe/julia.jpg" },
  { id: "danilo", label: "Danilo", role: "Art", photoUrl: "/equipe/danilo.jpg" },
  { id: "kleber", label: "Kleber", role: "Admin", photoUrl: "/equipe/kleber.jpg" },
];

const DEPARTAMENTOS = {
    'copy': { label: 'Redação & Copy', equipe: ['Mônica', 'Lucas'] },
    'arte': { label: 'Direção de Arte', equipe: ['Danilo', 'Felipe'] },
    'social': { label: 'Social Media', equipe: ['Julia', 'Roberto'] },
    'rtv': { label: 'Produção RTV', equipe: ['Rodrigo'] }
};

const TASK_FORMATS = ["Campanha", "Sempre On", "Lançamento", "Ação de PR", "Pesquisa"];

const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Backlog / Ideias', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Em Planejamento', color: 'bg-purple-500' },
    { id: 'done', label: 'Aprovado', color: 'bg-green-500' }
];

export default function Planning() {
  const { activeTenant, user } = useAuth();
  const editorName = user?.name || "Sistema";
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  
  // --- ESTADOS DO KANBAN ---
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);

  // --- ESTADOS DO PLANEJAMENTO (FOLHA) ---
  const [subClient, setSubClient] = useState(""); 
  const [objective, setObjective] = useState("");
  const [target, setTarget] = useState("");
  const [compiledBrief, setCompiledBrief] = useState<string>(""); 
  const [isGenerating, setIsGenerating] = useState(false);

  // --- MODAL DE EDIÇÃO ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState<{
    title: string; description: string; formats: string[]; status: string; assignees: string[];
  }>({ title: "", description: "", formats: [], status: "todo", assignees: [] });

  // --- ESTADOS DO CHAT ---
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const draftSaveTimerRef = useRef<number | null>(null);

  // === FETCH DO SUPABASE ===
  const fetchTasks = async () => {
      let query = supabase.from('tasks').select('*').eq('department', 'planning');
      if (activeTenant && activeTenant !== "all") {
        query = query.eq('tenant', activeTenant);
      }
      const { data } = await query;
      if (data) setTasks(data);
  };

  useEffect(() => { 
      fetchTasks(); 
      const channel = supabase.channel(`realtime:planning_tasks:${activeTenant || "all"}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: "department=eq.planning" }, 
        () => { fetchTasks(); toast.info("Novo Job na fila de Planejamento!"); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: "department=eq.planning" },
        () => { fetchTasks(); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter: "department=eq.planning" },
        () => { fetchTasks(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); }
  }, [activeTenant]);

  const filteredTasks = useMemo(() => {
    if (!activeTenant || activeTenant === "all") return tasks;
    return tasks.filter(t => t.tenant === activeTenant);
  }, [tasks, activeTenant]);

  useEffect(() => {
    if (!activeTask?.id) return;
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return;
    supabase
      .from("task_drafts")
      .select("state")
      .eq("tenant_slug", safeTenant)
      .eq("task_id", activeTask.id)
      .eq("department", "planning")
      .maybeSingle()
      .then(({ data }) => {
        const saved = data?.state as any;
        if (!saved) return;
        if (saved.briefingData) setBriefingData(saved.briefingData);
        if (saved.grid) setGrid(saved.grid);
        if (saved.chatHistory) setChatHistory(saved.chatHistory);
        if (saved.chatInput !== undefined) setChatInput(saved.chatInput);
      });
  }, [activeTenant, activeTask?.id]);

  useEffect(() => {
    if (!activeTask?.id) return;
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return;
    const stateToSave = {
      briefingData,
      grid,
      chatHistory,
      chatInput,
    };
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(async () => {
      await supabase.from("task_drafts").upsert(
        {
          tenant_slug: safeTenant,
          task_id: activeTask.id,
          department: "planning",
          state: stateToSave,
          updated_at: new Date().toISOString(),
          created_by: user?.id || null,
        },
        { onConflict: "tenant_slug,task_id,department" }
      );
    }, 800);
  }, [briefingData, grid, chatHistory, chatInput, activeTenant, activeTask?.id, user?.id]);

  useEffect(() => { setSubClient(""); setCompiledBrief(""); setActiveTask(null); setChatHistory([]); }, [activeTenant]);
  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatHistory]);

  // === KANBAN HANDLERS ===
  const handleDrop = async (taskId: number, status: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      await updateTaskStatus(taskId, status, editorName);
      await fetchTasks();
  };

  const handleOpenEditTask = (task: any) => {
    setNewTaskData({ title: task.title || "", description: task.description || "", formats: task.formats || [], status: task.status || "todo", assignees: task.assignees || [] });
    setEditingTaskId(task.id); setShowTaskModal(true);
  };

  const handleDeleteTask = async (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
      if(activeTask?.id === id) setActiveTask(null);
      toast.success("Tarefa excluída.");
  };

  const toggleFormat = (fmt: string) => setNewTaskData(prev => ({ ...prev, formats: prev.formats.includes(fmt) ? prev.formats.filter(f => f !== fmt) : [...prev.formats, fmt] }));
  const toggleAssignee = (personId: string) => setNewTaskData(prev => ({ ...prev, assignees: prev.assignees.includes(personId) ? prev.assignees.filter(id => id !== personId) : [...prev.assignees, personId] }));

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    if (!safeTenant) return toast.error("Selecione um cliente antes de criar um job.");
    const taskPayload = {
      tenant: safeTenant,
      department: 'planning',
      updated_by: editorName,
      title: newTaskData.title, 
      description: newTaskData.description, 
      formats: newTaskData.formats,
      status: newTaskData.status || "todo",
      assignees: newTaskData.assignees, 
      due_date: "Hoje"
    };

    if (editingTaskId) {
        await supabase.from('tasks').update(taskPayload).eq('id', editingTaskId);
        toast.success("Tarefa atualizada!");
    } else {
        await supabase.from('tasks').insert([taskPayload]);
        toast.success("Nova tarefa criada!");
    }
    fetchTasks(); setShowTaskModal(false); setEditingTaskId(null); 
  };

  const selectTaskForPlanning = (task: any) => {
      setActiveTask(task);
      setSubClient(task.tenant);
      
      if (task.status === 'done' && task.description && task.description.includes('OBJETIVO')) {
          setCompiledBrief(task.description);
          setObjective("Histórico carregado.");
          setTarget("");
          setChatHistory([{ role: 'assistant', content: `Carreguei o histórico do job **"${task.title}"**. Revise e edite livremente.` }]);
          toast.success("Histórico do Briefing carregado!");
      } else {
          setCompiledBrief("");
          const foco = task.formats?.length ? `Foco em: ${task.formats.join(', ')}.` : '';
          const detalhes = task.description ? `Contexto: ${task.description}.` : '';
          setObjective(`Desenvolver estratégia para: ${task.title}. ${foco} ${detalhes}`.trim());
          setTarget("");
          setChatHistory([{ role: 'assistant', content: `Excelente. Carreguei o job **"${task.title}"**. Preencha os campos e clique em Gerar.` }]);
          toast.info("Escopo preenchido com os dados do Job.");
      }
  };

  // === IA AGENTE E CHAT ===
  const handleGenerateStrategy = async () => {
      if (!objective) return toast.warning("Defina um objetivo para a campanha.");
      setIsGenerating(true);
      const brandContext = subClient ? `${activeTenant} - ${subClient}` : (activeTenant || "Mugô");
      try {
      const res = await fetch(PLANNING_AGENT_URL, {
              method: "POST",
              headers: await getAuthHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                tenant_slug: safeTenant,
                title: brandContext || "Planejamento",
                raw_input: objective,
                objective,
                target_audience: target || "Geral",
              })
          });
          if (!res.ok) throw new Error("Falha na API");
          const data = await res.json();
          
          const formattedBrief = `🎯 OBJETIVO DE NEGÓCIO:\n${objective}\n\n👤 PÚBLICO-ALVO:\n${target || 'Geral'}\n\n💡 INSIGHT CULTURAL:\n${data.insight}\n\n🚀 BIG IDEA (O Conceito):\n"${data.big_idea}"\n\n📢 TOM DE VOZ:\n${data.tone}\n\n📱 CANAIS TÁTICOS SUGERIDOS:\n${Array.isArray(data.channels) ? data.channels.join('\n- ') : data.channels}\n\n📊 KPIs E MÉTRICAS:\n${Array.isArray(data.kpis) ? data.kpis.join(' / ') : data.kpis}`;
          
          setCompiledBrief(formattedBrief);
          toast.success("Creative Brief gerado!");
          setChatHistory(prev => [...prev, { role: 'assistant', content: `Briefing criado e estruturado ao lado. Se quiser refinar a Big Idea ou pedir referências de mercado, é só falar comigo aqui.` }]);
      } catch (error) {
          toast.error("Erro de conexão. Gerando Mock.");
          const mockBrief = `🎯 OBJETIVO:\n${objective}\n\n🚀 BIG IDEA:\n"Seja Você Mesmo Sempre"\n\n💡 INSIGHT:\nO consumidor moderno detecta falsidade a quilômetros.\n\n📢 TOM DE VOZ:\nInspirador, humano.\n\n📱 CANAIS:\n- TikTok\n- OOH\n\n📊 KPIs:\nEngajamento orgânico`;
          setCompiledBrief(mockBrief);
      } finally { setIsGenerating(false); }
  };

  const handleSendChat = async () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput; setChatInput("");
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsChatLoading(true);
      try {
      if (!safeTenant) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: "Selecione um cliente antes de continuar." }]);
          setIsChatLoading(false);
          return;
      }
      const res = await fetch(PLANNING_CHAT_URL, {
          method: "POST",
          headers: await getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ 
                  tenant_slug: safeTenant,
                  message: userMsg,
                  extra_context: compiledBrief,
                  history: chatHistory.slice(-4).map(h => ({ role: h.role, content: h.content })) 
          })
      });
          const data = await res.json();
          setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } catch (e) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: "Ops, perdi a conexão com o servidor." }]);
      } finally { setIsChatLoading(false); }
  };

  // ✅ O DESPACHO REAL (Cria no Kanban de quem vai fazer a arte/copy)
  const handleDispatch = async (deptKey: string, person: string) => {
      if (!compiledBrief) return toast.warning("Gere ou preencha o Creative Brief primeiro.");
      if (!safeTenant) return toast.error("Selecione um cliente antes de despachar.");
      const targetDepartment = DEPARTAMENTOS[deptKey as keyof typeof DEPARTAMENTOS].label;
      
      // 1. Encerra aqui no Planejamento
      if (activeTask) {
          setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: 'doing', description: compiledBrief } : t));
          await supabase.from('tasks').update({ status: 'doing', description: compiledBrief }).eq('id', activeTask.id);
      }

      // 2. Prepara o Job para o destino
      const newDispatchedTask = {
          tenant: safeTenant,
          department: deptKey, // ex: 'copy' ou 'arte'
          title: activeTask ? activeTask.title : "Nova Campanha",
          description: compiledBrief, 
          formats: ["Campanha"],
          status: "todo", // Sempre cai na primeira coluna do departamento
          assignees: [person.toLowerCase()],
          due_date: "Semana que vem"
      };

      try {
          await supabase.from('tasks').insert([newDispatchedTask]);
          toast.success(`Job despachado para a mesa de ${person} (${targetDepartment})!`);
          setChatHistory(prev => [...prev, { role: 'assistant', content: `✅ Job salvo e enviado com sucesso para ${targetDepartment}. O card agora está na coluna de Aprovados e no Kanban deles.` }]);
      } catch (error) {
          toast.error("Erro ao enviar para o Banco de Dados.");
      }
      
      setCompiledBrief(""); setActiveTask(null); setObjective(""); setTarget("");
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col h-screen overflow-hidden font-sans">
        
        <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 shrink-0 bg-black z-20">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg"><CalendarDays className="w-6 h-6 text-purple-500" /></div>
                <h1 className="text-lg font-bold">Planejamento Estratégico</h1>
            </div>
            <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-400 hover:text-white transition-all bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
                <Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher Kanban" : "Ver Kanban"}
                {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* O KANBAN UNIVERSAL */}
            <KanbanBoard 
                isExpanded={isKanbanExpanded}
                onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
                tasks={filteredTasks}
                activeTask={activeTask}
                onTaskSelect={(task) => selectTaskForPlanning(task)} // Abre o job na folha de planejamento
                onTaskDelete={handleDeleteTask}
                onTaskDrop={handleDrop}
                onTaskEdit={handleOpenEditTask}
                onNewTaskClick={(status) => { 
                    setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] });
                    setEditingTaskId(null); setShowTaskModal(true); 
                }}
            />

            {/* ÁREA DE TRABALHO: ESCOPO & CHAT (LADO A LADO) */}
            <div className="flex-1 flex overflow-hidden bg-black">
                
                {/* LADO ESQUERDO: ESCOPO E ESTRATÉGIA EDITÁVEL */}
                <div className="flex-1 flex flex-col overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
                    <div className="max-w-4xl mx-auto w-full space-y-6">
                        
                        {/* INPUTS INICIAIS MAIORES */}
                        <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
                            <CardHeader className="pb-3 border-b border-zinc-800/50">
                                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-500"/> Contexto do Job</div>
                                    {activeTask && <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-500/30">Lincado ao Job: {activeTask.title}</Badge>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Público-Alvo</label>
                                        <Textarea className="bg-black border-zinc-700 text-white min-h-[100px] text-xs focus:border-purple-500 resize-none p-3 leading-relaxed" placeholder="Ex: Jovens de 18-25 anos..." value={target} onChange={e=>setTarget(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Objetivo de Negócio</label>
                                        <Textarea className="bg-black border-zinc-700 text-white min-h-[100px] text-xs focus:border-purple-500 resize-none p-3 leading-relaxed" placeholder="Ex: Aumentar as vendas do produto X..." value={objective} onChange={e=>setObjective(e.target.value)} />
                                    </div>
                                </div>
                                {!compiledBrief && (
                                    <Button onClick={handleGenerateStrategy} disabled={isGenerating || !objective} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm h-12 shadow-lg shadow-purple-900/20 mt-2 transition-transform hover:scale-[1.01]">
                                        {isGenerating ? <><BrainCircuit className="w-4 h-4 mr-2 animate-pulse"/> Analisando e Criando Creative Brief...</> : <><Sparkles className="w-4 h-4 mr-2"/> Gerar Creative Brief</>}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* O DOCUMENTO ESTRATÉGICO UNIFICADO */}
                        {compiledBrief && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500"/> Creative Brief</h3>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1"><Edit3 className="w-3 h-3"/> Edite livremente o documento abaixo</p>
                                </div>

                                {/* O PAPER INFINITO DO PLANEJAMENTO */}
                                <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl relative group overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target className="w-64 h-64 text-purple-400"/></div>
                                    <Textarea 
                                        className="w-full h-full min-h-[400px] bg-transparent border-none text-sm text-zinc-200 resize-none p-8 focus:ring-0 leading-relaxed font-mono z-10" 
                                        value={compiledBrief} 
                                        onChange={e => setCompiledBrief(e.target.value)}
                                        placeholder="O seu briefing aparecerá aqui..."
                                    />
                                </div>

                                {/* BARRA DE AÇÃO FINAL (DESPACHO) */}
                                <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700 p-4 rounded-xl flex items-center justify-between mt-6 shadow-xl sticky bottom-4 z-10">
                                    <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
                                        <CheckCircle2 className="w-5 h-5"/> Briefing Pronto
                                    </div>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button className="bg-purple-600 hover:bg-purple-500 text-white gap-2 font-bold shadow-lg shadow-purple-900/20 px-6">Aprovar e Despachar Job <ArrowRight className="w-4 h-4"/></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-zinc-900 border-zinc-700 text-white w-56 mb-2" align="end">
                                            <DropdownMenuLabel className="text-xs text-zinc-500 uppercase">Enviar para a Mesa de:</DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-zinc-800" />
                                            {Object.entries(DEPARTAMENTOS).map(([key, dept]: any) => (
                                                <DropdownMenuSub key={key}>
                                                    <DropdownMenuSubTrigger className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 py-2"><span>{dept.label}</span></DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className="bg-zinc-900 border-zinc-700 text-white ml-2">
                                                        {dept.equipe.map((pessoa: string) => (<DropdownMenuItem key={pessoa} className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 gap-2" onClick={() => handleDispatch(key, pessoa)}><div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold">{pessoa.charAt(0)}</div>{pessoa}</DropdownMenuItem>))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* LADO DIREITO: CHAT COPILOTO */}
                <div className="w-[400px] bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0 relative z-10">
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3 shadow-md z-10">
                        <div className="bg-purple-500/20 p-2 rounded-lg"><BrainCircuit className="w-5 h-5 text-purple-500" /></div>
                        <div>
                            <h3 className="text-sm font-bold text-white">CSO Copilot</h3>
                            <p className="text-[10px] text-zinc-400">Refine a estratégia com IA.</p>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-6 pb-32 scrollbar-thin scrollbar-thumb-zinc-800">
                        {chatHistory.length === 0 && !isChatLoading && (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50 space-y-3">
                                <Bot className="w-10 h-10" />
                                <p className="text-xs text-center max-w-[200px]">Estou pronto para ajudar. Selecione um job ou peça ideias criativas abaixo.</p>
                            </div>
                        )}

                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-2xl max-w-[95%] text-sm leading-relaxed whitespace-pre-wrap shadow-lg ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-none border border-zinc-700' : 'bg-black text-zinc-200 border border-zinc-800 rounded-bl-none'}`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex items-center gap-2 text-xs text-zinc-500 ml-2 animate-pulse"><Bot className="w-4 h-4" /> Pensando como estrategista...</div>
                        )}
                        <div ref={chatScrollRef} />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800">
                        <div className="relative bg-black rounded-xl border border-zinc-700 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all shadow-inner">
                            <Textarea 
                                className="w-full bg-transparent border-none text-sm text-white resize-none min-h-[80px] p-3 focus-visible:ring-0 placeholder:text-zinc-600"
                                placeholder={`Discuta o Briefing com a IA...`}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                            />
                            <div className="flex justify-between items-center p-2 border-t border-zinc-800/50 bg-black/50 rounded-b-xl">
                                <span className="text-[10px] text-zinc-600 pl-2">Treinado em frameworks de Cannes</span>
                                <button 
                                    onClick={handleSendChat}
                                    disabled={!chatInput.trim() || isChatLoading}
                                    className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* MODAL DE EDIÇÃO E CRIAÇÃO */}
        {showTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#18181b] border border-zinc-800 p-8 rounded-2xl w-[500px] shadow-2xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white"><Plus className="w-5 h-5 text-purple-500" /> {editingTaskId ? "Editar Planejamento" : "Novo Planejamento"}</h3>
                <div className="space-y-5">
                <div><label className="text-xs text-zinc-400 mb-1 block">Título do Job *</label><input autoFocus className="w-full bg-black border border-purple-500 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.1)]" value={newTaskData.title} onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") handleSaveTask(); }} /></div>
                <div><label className="text-xs text-zinc-400 mb-1 block">Escopo Resumido</label><textarea className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 focus:outline-none min-h-[100px] resize-none" value={newTaskData.description} onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })} /></div>
                <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Formatos / Tipo</label>
                    <div className="flex flex-wrap gap-2">
                    {TASK_FORMATS.map((f) => (
                        <button key={f} onClick={() => toggleFormat(f)} className={`text-xs border px-3 py-1.5 rounded-md transition ${newTaskData.formats.includes(f) ? "bg-zinc-800 border-zinc-600 text-white" : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>{f}</button>
                    ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Status</label>
                    <div className="flex gap-2">
                    {KANBAN_COLUMNS.map((col) => (
                        <button key={col.id} onClick={() => setNewTaskData({ ...newTaskData, status: col.id })} className={`text-xs border px-4 py-2 rounded-md transition font-medium ${newTaskData.status === col.id ? "bg-purple-600 border-purple-500 text-white" : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>{col.label}</button>
                    ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Estrategistas (Donos do Job)</label>
                    <div className="grid grid-cols-5 gap-2">
                    {EQUIPE.map((p) => {
                        const isSelected = newTaskData.assignees?.includes(p.id);
                        return (
                        <button key={p.id} onClick={() => toggleAssignee(p.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition ${isSelected ? "bg-zinc-800 border-zinc-600" : "bg-black border-zinc-900 hover:border-zinc-800"}`}>
                            <img src={p.photoUrl} alt={p.label} className={`w-8 h-8 rounded-full object-cover ${isSelected ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-black" : "opacity-50"}`} onError={(e) => { (e.target as any).style.display = "none"; }} />
                            <span className={`text-[9px] ${isSelected ? "text-white font-bold" : "text-zinc-600"}`}>{p.label}</span>
                        </button>
                        );
                    })}
                    </div>
                </div>
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-zinc-800/50">
                <Button variant="ghost" className="text-white font-bold hover:bg-zinc-800" onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }}>Cancelar</Button>
                <Button onClick={handleSaveTask} className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-6">{editingTaskId ? "Salvar Alterações" : "Criar Job"}</Button>
                </div>
            </div>
            </div>
        )}
    </div>
  );
}

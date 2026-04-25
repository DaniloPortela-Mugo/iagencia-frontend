import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
  PenTool, Layout, ChevronUp, ChevronDown, Target, CheckCircle2, Save, 
  ChevronRight, BrainCircuit, ArrowLeftCircle, Bot, Send, 
  Plus, FileText, Edit3, ChevronLeft, Loader2, 
} from "lucide-react";

import { KanbanBoard } from "../components/KanbanBoard";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const COPY_CHAT_URL =
  import.meta.env.VITE_COPY_CHAT_URL?.trim() || `${API_BASE}/copy/chat`;

const getAuthHeaders = async (extra?: Record<string, string>) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};


export interface Task {
  id: number;
  created_at: string;
  tenant: string;
  department: string;
  title: string;
  description: string | null;
  status: string;
  formats: string[];
  assignees: string[];
  due_date: string | null;
  briefing_data?: any; 
}


const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Fila de Jobs (Briefing)', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Na Pauta', color: 'bg-blue-500' },
    { id: 'review', label: 'Aprovação Interna', color: 'bg-orange-500' },
    { id: 'done', label: 'Finalizado', color: 'bg-green-500' }
];

const EQUIPE = [
  { id: "joao", label: "João (Copy)", photoUrl: "/equipe/joao.jpg" },
  { id: "maria", label: "Maria (Redatora)", photoUrl: "/equipe/maria.jpg" },
  { id: "danilo", label: "Danilo (Arte)", photoUrl: "/equipe/danilo.jpg" },
];

const TASK_FORMATS = ["Artigo Blog", "Post Social Media", "Roteiro Vídeo", "Email Marketing", "Página de Vendas"];

const DEPARTAMENTOS = {
  estudio_imagem: { label: "Estúdio de Imagem", equipe: ["Danilo", "Felipe"] },
  estudio_video: { label: "Estúdio de Vídeo", equipe: ["Carlos", "Ana"] },
  aprovacao: { label: "Aprovação (Atendimento)", equipe: ["Ana", "Pedro"] }
};

export default function RedacaoPage() {
  const { activeTenant, user } = useAuth();
  const editorName = user?.name || "Sistema";
  
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState({ title: "", description: "", formats: [] as string[], status: "todo", assignees: [] as string[] });

  const [isSaving, setIsSaving] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const draftSaveTimerRef = useRef<number | null>(null);

  const [isBriefingExpanded, setIsBriefingExpanded] = useState(true);
  const [dispatchTargets, setDispatchTargets] = useState<Record<string, boolean>>({
    approval: false,
    image: false,
    video: false,
    production: false,
    atendimento: false,
    library: false,
    social: false
  });



 // === BUSCAR DADOS ===
  const fetchTasks = async () => {
      let query = supabase.from('tasks').select('*').eq('department', 'redacao');
      if (activeTenant && activeTenant !== "all") {
        query = query.eq('tenant', activeTenant);
      }
      const { data: mainTasks } = await query;
      if (!mainTasks) return;

      const parentIds = mainTasks.map((t: any) => t.id);
      let childData: any[] = [];
      if (parentIds.length > 0) {
        const { data } = await supabase.from('tasks').select('*').in('parent_task_id', parentIds);
        childData = data || [];
      }

      const existingIds = new Set(mainTasks.map((t: any) => t.id));
      const uniqueChildren = childData.filter((t: any) => !existingIds.has(t.id));
      setTasks([...mainTasks, ...uniqueChildren]);
  };

  useEffect(() => {
      fetchTasks();
      const channel = supabase.channel(`realtime:redacao_tasks:${activeTenant || "all"}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: "department=eq.redacao" },
        () => { fetchTasks(); toast.info("Novo Job na fila!"); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: "department=eq.redacao" },
        () => { fetchTasks(); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter: "department=eq.redacao" },
        () => { fetchTasks(); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' },
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
      .eq("department", "redacao")
      .maybeSingle()
      .then(({ data }) => {
        const saved = data?.state as any;
        if (!saved) return;
        if (saved.editorContent !== undefined) setEditorContent(saved.editorContent);
        if (saved.chatHistory) setChatHistory(saved.chatHistory);
        if (saved.chatInput !== undefined) setChatInput(saved.chatInput);
        if (saved.isBriefingExpanded !== undefined) setIsBriefingExpanded(saved.isBriefingExpanded);
      });
  }, [activeTenant, activeTask?.id]);

  useEffect(() => {
    if (!activeTask?.id) return;
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return;
    const stateToSave = {
      editorContent,
      chatHistory,
      chatInput,
      isBriefingExpanded,
    };
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(async () => {
      await supabase.from("task_drafts").upsert(
        {
          tenant_slug: safeTenant,
          task_id: activeTask.id,
          department: "redacao",
          state: stateToSave,
          updated_at: new Date().toISOString(),
          created_by: user?.id || null,
        },
        { onConflict: "tenant_slug,task_id,department" }
      );
    }, 800);
  }, [editorContent, chatHistory, chatInput, isBriefingExpanded, activeTenant, activeTask?.id, user?.id]);

  // 🔥 HELPER EXTRAÍDO: Agora a sua barra lateral do JSX pode usar o stripHtml tranquilamente
  const stripHtml = (html?: string) => {
      if (!html) return "";
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
  };

  // 🔥 O GRANDE AJUSTE: O clique no card NÃO joga mais o briefing no editor de texto!
  useEffect(() => {
    if (activeTask) {
      // O editor agora inicia em branco para o redator criar.
      // O texto do briefing ficará seguro lá na barra lateral de "Visualizar".
      setEditorContent(""); 
    }
  }, [activeTask?.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isChatLoading]);


  // === KANBAN HANDLERS ===
  const handleDrop = async (taskId: number, status: string) => {
      const previousTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      const { error } = await updateTaskStatus(taskId, status, editorName);
      if (error) { setTasks(previousTasks); toast.error("Erro ao mover card."); }
      else { await fetchTasks(); }
  };

const handleSelectTask = (task: Task) => {
    // Agora o TS sabe que task tem .id, .title, etc.
    setActiveTask(task); 
    
    // Conforme seu pedido: O redator sempre começa com a folha em branco
    // O texto original (ou briefing) ele consulta na barra lateral (task.description)
    setEditorContent(""); 
    
    toast.info(`Editando: ${task.title}`);
};


  const handleDeleteTask = async (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id)); 
      await supabase.from('tasks').delete().eq('id', id); 
      if(activeTask?.id === id) setActiveTask(null);
      toast.success("Job removido.");
  };

  const handleOpenEditTask = (task: any) => {
      setNewTaskData({ title: task.title || "", description: task.description || "", formats: task.formats || [], status: task.status || "todo", assignees: task.assignees || [] });
      setEditingTaskId(task.id); setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    const payload = {
      tenant: activeTenant === "all" ? "geral" : activeTenant,
      department: 'redacao',
      created_by: user?.id || null,
      updated_by: editorName,
      ...newTaskData
    };
    if (editingTaskId) { 
        await supabase.from('tasks').update(payload).eq('id', editingTaskId); 
        if (activeTask && activeTask.id === editingTaskId) setActiveTask({ ...activeTask, ...payload });
        toast.success("Tarefa atualizada!"); 
    } else { 
        await supabase.from('tasks').insert([payload]); 
        toast.success("Novo documento criado!"); 
    }
    fetchTasks(); setShowTaskModal(false); setEditingTaskId(null);
  };

  // === AÇÕES DE SALVAR E ENVIAR ===
  const handleSave = async () => {
      if(!activeTask) return;
      setIsSaving(true);
      try {
          await supabase.from('tasks').update({ description: editorContent }).eq('id', activeTask.id);
          setActiveTask({ ...activeTask, description: editorContent });
          toast.success("Rascunho guardado com sucesso.");
      } catch (e) { toast.error("Erro ao guardar o rascunho."); } finally { setIsSaving(false); }
  };

  const handleSend = async (departamento: string, pessoa: string) => {
      if(!activeTask) return;
      const targetDepartment = DEPARTAMENTOS[departamento as keyof typeof DEPARTAMENTOS].label;

      await supabase.from('tasks').update({ status: 'doing', description: editorContent }).eq('id', activeTask.id);

      const newDispatchedTask = {
          tenant: activeTask.tenant,
          department: departamento,
          parent_task_id: activeTask.parent_task_id || activeTask.id,
          created_by: user?.id || null,
          title: activeTask.title,
          description: editorContent, // Texto da redação viaja junto
          briefing_data: activeTask.briefing_data || {}, // BRIEFING ORIGINAL MANTIDO!
          formats: activeTask.formats,
          status: "todo", 
          assignees: [pessoa.toLowerCase()]
      };

      const { error } = await supabase.from('tasks').insert([newDispatchedTask]);
      if(error) return toast.error("Falha ao despachar job.");
      
      fetchTasks(); setActiveTask(null);
      toast.success(`Enviado para ${pessoa} (${targetDepartment})!`);
  };

  const handleSendToTargets = async () => {
      if (!activeTask || !editorContent.trim()) {
          return toast.error("O documento está vazio. Escreva o texto antes de enviar.");
      }

      const selected = Object.entries(dispatchTargets)
        .filter(([, v]) => v)
        .map(([k]) => k);

      if (selected.length === 0) {
        return toast.error("Selecione pelo menos um destino.");
      }

      setIsSaving(true);
      
      try {
          const hasApproval = selected.includes("approval");
          const nextStatus = hasApproval ? "review" : "doing";
          const { error: taskError } = await supabase
              .from('tasks')
              .update({ 
                  description: editorContent, 
                  status: nextStatus
              })
              .eq('id', activeTask.id);

          if (taskError) throw taskError;

          const deptMap: Record<string, string> = {
            image: "arte",
            video: "producao",
            production: "producao",
            atendimento: "atendimento",
            social: "social_media",
          };

          for (const target of selected) {
            if (target === "approval") {
              const { error: approvalError } = await supabase
                .from('approvals')
                .insert([{
                  task_id: activeTask.id,
                  tenant_slug: activeTask.tenant,
                  type: 'text',
                  status: 'pending'
                }]);
              if (approvalError) throw approvalError;
              continue;
            }

            if (target === "library") {
              const { error: libError } = await supabase
                .from("library")
                .insert([{
                  tenant_slug: activeTask.tenant,
                  url: `text:${encodeURIComponent(editorContent)}`,
                  type: "text",
                  title: activeTask.title || "Texto",
                  metadata: { task_id: activeTask.id, source: "redacao" }
                }]);
              if (libError) throw libError;
              continue;
            }

            const department = deptMap[target];
            if (!department) continue;

            const newDispatchedTask = {
              tenant: activeTask.tenant,
              department,
              parent_task_id: activeTask.parent_task_id || activeTask.id,
              created_by: user?.id || null,
              title: activeTask.title,
              description: editorContent,
              briefing_data: activeTask.briefing_data || {},
              formats: activeTask.formats,
              status: "doing",
              assignees: []
            };

            const { error } = await supabase.from('tasks').insert([newDispatchedTask]);
            if (error) throw error;
          }

          toast.success("Envios concluídos.");
          setActiveTask(null);
          setEditorContent("");
          setDispatchTargets({
            approval: false,
            image: false,
            video: false,
            production: false,
            atendimento: false,
            library: false,
            social: false
          });
          if (typeof fetchTasks === 'function') fetchTasks();

      } catch (e) {
          toast.error("Erro ao processar o envio.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSendMessage = async () => {
      if(!chatInput.trim() || !activeTask) return;
      const msg = chatInput;
      setChatInput(""); setChatHistory(prev => [...prev, { role: 'user', content: msg }]); setIsChatLoading(true);
      
      const contextBriefing = activeTask.briefing_data?.objective 
        ? `Objetivo: ${activeTask.briefing_data.objective} | Mensagem: ${activeTask.briefing_data.key_message}`
        : activeTask.description;

      try {
          const res = await fetch(COPY_CHAT_URL, { 
              method: "POST",
              headers: await getAuthHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                tenant_slug: activeTask.tenant,
                client: activeTask.tenant || "Geral",
                message: msg,
                briefing: contextBriefing || "",
                history: chatHistory.map(h => ({ role: h.role, content: h.content })),
              }) 
          });
          const data = await res.json(); 
          setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } catch (e) { setChatHistory(prev => [...prev, { role: 'assistant', content: "Erro de IA." }]); } finally { setIsChatLoading(false); }
  };

  const insertFromChat = (text: string) => {
      setEditorContent(prev => prev + "\n\n" + text);
      toast.success("Texto adicionado ao final.");
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col h-screen overflow-hidden font-sans">
        
        <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 shrink-0 bg-zinc-950 z-20">
            <div className="flex items-center gap-3"><div className="p-2 bg-pink-900/30 rounded-lg"><PenTool className="w-6 h-6 text-pink-500" /></div><h1 className="text-lg font-bold">Departamento de Redação</h1></div>
            <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-200 bg-pink-600 px-3 py-1.5 rounded border border-pink-800 hover:text-white transition"><Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher a Pauta" : "Ver a Pauta"}{isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
        </header>

        <KanbanBoard 
            isExpanded={isKanbanExpanded} onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
            tasks={filteredTasks} activeTask={activeTask} onTaskSelect={(task) => setActiveTask(task)}
            onTaskDrop={handleDrop} onTaskDelete={handleDeleteTask} onTaskEdit={handleOpenEditTask}
            onNewTaskClick={(status) => { setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] }); setEditingTaskId(null); setShowTaskModal(true); }}
        />

        <div className="flex-1 flex overflow-hidden bg-black relative">
            {activeTask ? (
                <>
                    {/* COLUNA 1: BRIEFING RETRÁTIL (ESQUERDA) */}
                    <div className={`shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto scrollbar-thin transition-all duration-300 relative ${isBriefingExpanded ? 'w-[320px]' : 'w-[50px] items-center'}`}>
                        {/* Faixa Superior Roxa */}
                        <div className="absolute top-0 left-0 w-full h-8 bg-purple-900/20 border-b border-purple-900/50 flex items-center justify-center text-[10px] text-purple-300 font-bold tracking-widest uppercase z-10 whitespace-nowrap overflow-hidden text-ellipsis px-2">
                            {isBriefingExpanded ? `Job: ${activeTask.title}` : 'JOB'}
                        </div>
                        
                        <div className="mt-12 px-3 pb-4">
                            <button onClick={() => setIsBriefingExpanded(!isBriefingExpanded)} className={`w-full flex ${isBriefingExpanded ? 'justify-between' : 'justify-center'} items-center text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors p-2 bg-blue-950/30 border border-blue-900/50 rounded-lg shadow-inner`}>
                                {isBriefingExpanded && <span className="flex items-center gap-2"><FileText className="w-3 h-3"/> Briefing</span>}
                                {isBriefingExpanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            
                            {isBriefingExpanded && (
                                <div className="mt-3 animate-in fade-in slide-in-from-left-2 space-y-4">
                                    {activeTask.briefing_data && Object.keys(activeTask.briefing_data).length > 0 ? (
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3">
                                            <div>
                                                <strong className="text-[10px] text-zinc-500 uppercase block mb-1">Objetivo</strong> 
                                                <p className="text-xs text-zinc-300 leading-relaxed">{activeTask.briefing_data.objective}</p>
                                            </div>
                                            <div>
                                                <strong className="text-[10px] text-zinc-500 uppercase block mb-1">Mensagem Chave</strong> 
                                                <p className="text-xs text-blue-200 italic leading-relaxed">"{activeTask.briefing_data.key_message}"</p>
                                            </div>
                                            {activeTask.briefing_data.tech_requirements && (
                                                <div className="bg-black/50 p-2 rounded border border-zinc-800">
                                                    <strong className="text-[9px] text-zinc-500 uppercase block mb-1">Requisitos</strong>
                                                    <p className="text-[10px] text-zinc-400 font-mono">{activeTask.briefing_data.tech_requirements}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                            <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">{stripHtml(activeTask.description)}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA 2: ÁREA DO REDATOR (CENTRO) */}
                    <div className="flex-1 flex flex-col border-r border-zinc-800 relative bg-[#e5e5e5]">
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
                            {/* EDITOR TEXTAREA (Folha Branca) */}
                            <div className="w-full max-w-[210mm] bg-white shadow-xl p-[15mm] text-slate-900 mb-[50px] min-h-[800px] flex flex-col rounded">
                                <h1 className="text-2xl font-bold mb-6 border-b pb-3 text-zinc-800">{activeTask.title}</h1>
                                <textarea 
                                    className="w-full flex-1 resize-none focus:outline-none bg-transparent font-serif text-base leading-relaxed text-zinc-800" 
                                    value={editorContent} 
                                    onChange={(e) => setEditorContent(e.target.value)} 
                                />
                            </div>
                        </div>
                        
                        {/* Barra Inferior (Salvar e Enviar) */}
<div className="h-16 bg-white border-t border-zinc-300 px-6 flex items-center justify-between shrink-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
    <div className="text-xs text-zinc-500 flex items-center gap-2">
        {isSaving ? (
            <span className="animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div> 
                Sincronizando rascunho...
            </span>
        ) : (
            <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5"/> Documento Seguro
            </span>
        )}
    </div>

    <div className="flex gap-3">
        {/* Botão de Salvar Rascunho - Mantido para segurança do redator */}
        <Button 
            variant="outline" 
            onClick={handleSave} 
            disabled={isSaving} 
            className="text-zinc-700 border-zinc-300 hover:bg-zinc-100 gap-2 h-11 px-6 rounded-xl transition-all"
        >
            <Save className="w-4 h-4"/> Salvar Rascunho
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              disabled={isSaving || !editorContent.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-black px-8 h-11 border-none shadow-lg shadow-emerald-900/20 rounded-xl transition-all hover:scale-[1.02] active:scale-95 tracking-tight"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              ENVIAR PARA
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Destinos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.approval}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, approval: Boolean(v) }))}
            >
              Aprovação
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.image}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, image: Boolean(v) }))}
            >
              Estúdio de Imagem
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.video}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, video: Boolean(v) }))}
            >
              Estúdio de Vídeo
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.production}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, production: Boolean(v) }))}
            >
              Produção
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.atendimento}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, atendimento: Boolean(v) }))}
            >
              Atendimento
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.library}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, library: Boolean(v) }))}
            >
              Biblioteca
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={dispatchTargets.social}
              onCheckedChange={(v) => setDispatchTargets(prev => ({ ...prev, social: Boolean(v) }))}
            >
              Social Media
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSendToTargets}>
              Enviar selecionados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
</div>
                    </div>

                    {/* COLUNA 3: CHAT IA (DIREITA) */}
                    <div className="w-[380px] bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 relative">
                        <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/50">
                            <div className="bg-pink-500/20 p-2 rounded-lg border border-pink-500/30"><BrainCircuit className="w-5 h-5 text-pink-400" /></div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-100">Parceiro Criativo</h3>
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1">Contexto: <span className="text-pink-400 uppercase font-bold px-1.5 py-0.5 bg-pink-950/50 rounded">{activeTask.tenant || 'Geral'}</span></p>
                            </div>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-32 scrollbar-thin">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-50">
                                    <Bot className="w-12 h-12 text-zinc-600 mb-3" />
                                    <p className="text-xs text-zinc-400">Estou conectado ao briefing deste job. Peça ideias de títulos, roteiros ou conceitos.</p>
                                </div>
                            )}
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3.5 rounded-2xl max-w-[90%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-100 rounded-br-sm border border-zinc-700' : 'bg-black text-zinc-300 border border-zinc-800 rounded-bl-sm shadow-sm'}`}>
                                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                                    </div>
                                    {msg.role === 'assistant' && (
                                        <Button onClick={() => insertFromChat(msg.content)} className="mt-2 text-[10px] h-7 px-3 bg-zinc-800 hover:bg-pink-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-pink-500 transition-colors">
                                            <ArrowLeftCircle className="w-3 h-3 mr-1.5" /> Colar no Texto
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {isChatLoading && <div className="flex gap-1 ml-2 mt-2"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce delay-150"></div></div>}
                            <div ref={chatEndRef} />
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                            <div className="relative bg-zinc-900 rounded-xl border border-zinc-700 focus-within:border-pink-500 transition-all overflow-hidden shadow-inner">
                                <Textarea className="w-full bg-transparent border-none text-sm text-zinc-200 resize-none min-h-[60px] p-3 focus-visible:ring-0 placeholder:text-zinc-600" placeholder={`Peça ideias para a IA...`} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                                <div className="flex justify-between items-center p-2 bg-zinc-950 border-t border-zinc-800/50">
                                    <span className="text-[9px] text-zinc-500 pl-2 font-mono uppercase tracking-widest">Shift+Enter quebra linha</span>
                                    <button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatLoading} className="p-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:hover:bg-pink-600 text-white rounded-lg shadow-sm transition-colors"><Send className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 bg-black">
                    <div className="bg-zinc-900/50 p-8 rounded-full mb-4 border border-zinc-800/50 shadow-inner"><FileText className="w-16 h-16 text-zinc-700"/></div>
                    <p className="text-sm font-medium">Selecione um Job no Kanban para abrir a prancheta de Redação.</p>
                </div>
            )}
        </div>
    </div>
  );
}

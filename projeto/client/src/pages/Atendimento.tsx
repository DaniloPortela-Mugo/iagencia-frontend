import React, { useState, useEffect, useMemo } from "react";
import {
  Layout, ChevronUp, ChevronDown, Plus,
  MessageSquare, Wand2, Target, FileText,
  CheckCircle2, ArrowRight, Zap,
  Clock, Briefcase, Lightbulb, User, Edit3, Trash2, Loader2, LinkIcon, Share, Video, Palette, Share2,
  Save, RotateCcw, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";


// IMPORTAÇÕES VITAIS DA BASE DE DADOS E KANBAN UNIVERSAL
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { KanbanBoard } from "../components/KanbanBoard";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const ATENDIMENTO_AGENT_URL =
  import.meta.env.VITE_ATENDIMENTO_AGENT_URL?.trim() || `${API_URL}/atendimento/agent`;

const EQUIPE = [
  { id: "julia", label: "Julia", role: "Plan", photoUrl: "/equipe/julia.jpg" },
  { id: "kleber", label: "Kleber", role: "Admin", photoUrl: "/equipe/kleber.jpg" },
];

const TASK_FORMATS = ["Briefing Geral", "Orçamento", "Alteração de Escopo", "Dúvida Cliente"];

const DISPATCH_OPTIONS: { id: string; label: string; color: string; text: string; mapsTo?: string }[] = [
  { id: "redacao",      label: "Redação",  color: "bg-amber-500",   text: "text-amber-50" },
  { id: "arte",         label: "Arte",     color: "bg-sky-500",     text: "text-sky-50" },
  { id: "producao",     label: "Produção", color: "bg-emerald-500", text: "text-emerald-50" },
  { id: "video",        label: "Vídeo",    color: "bg-purple-500",  text: "text-purple-50" },
  { id: "social_media", label: "Social",   color: "bg-pink-500",    text: "text-pink-50" },
];

const DEPT_ASSIGNEES: Record<string, { id: string; label: string }[]> = {
  redacao: [
    { id: "danilo", label: "Danilo" },
    { id: "julia", label: "Julia" },
  ],
  arte: [
    { id: "danilo", label: "Danilo" },
    { id: "felipe", label: "Felipe" },
  ],
  producao: [
    { id: "carlos", label: "Carlos" },
    { id: "ana", label: "Ana" },
  ],
  social_media: [
    { id: "monica", label: "Mônica" },
    { id: "lucas", label: "Lucas" },
  ],
  atendimento: [
    { id: "julia", label: "Julia" },
    { id: "kleber", label: "Kleber" },
  ],
};

const ROLE_TO_DEPT: Record<string, string> = {
  redator: "redacao",
  da: "arte",
  social_media: "social_media",
  atendimento: "atendimento",
  producao: "producao",
  midia: "media",
  planejamento: "planning",
};

// Colunas alinhadas com o Kanban Universal
const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Fila (Entrada)', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Em Definição', color: 'bg-blue-500' },
    { id: 'review', label: 'Aguardando Cliente', color: 'bg-orange-500' },
    { id: 'done', label: 'Aprovado', color: 'bg-green-500' }
];

export default function Atendimento() {
  const { activeTenant, user, tenantAccess } = useAuth();
  const editorName = user?.name || "Sistema";
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("escopo");
  const [tenantOptions, setTenantOptions] = useState<{ slug: string; name: string }[]>([]);

  // === ESTADOS LIGADOS AO SUPABASE ===
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);

  // === ESTADOS DO AGENTE IA ===
  const [subClient, setSubClient] = useState("");
  const [title, setTitle] = useState("");
  const [rawRequest, setRawRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingPreview, setStreamingPreview] = useState("");
  const [briefingResult, setBriefingResult] = useState<any>(null);
  // Chat livre
  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [childTasks, setChildTasks] = useState<any[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [deptMembers, setDeptMembers] = useState<Record<string, { id: string; label: string }[]>>({});
  const [reassignLogByTask, setReassignLogByTask] = useState<Record<number, any>>({});

  // --- MODAL DE CRIAÇÃO/EDIÇÃO ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState<{
    title: string; description: string; formats: string[]; status: string; assignees: string[];
  }>({ title: "", description: "", formats: [], status: "todo", assignees: [] });


  const [objective, setObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [cta, setCta] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [boldness, setBoldness] = useState("3"); // Nível de ousadia 1-5

  const [references, setReferences] = useState("");

  // === HISTÓRICO DE BRIEFINGS ===
  const [briefingHistory, setBriefingHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  const getDeliverables = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
    return [];
  };

  const loadBriefingHistory = async () => {
    const tenant = subClient || (activeTenant && activeTenant !== "all" ? activeTenant : null);
    if (!tenant) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("briefing_history")
      .select("*")
      .eq("tenant_slug", tenant)
      .order("created_at", { ascending: false })
      .limit(50);
    setBriefingHistory(data || []);
    setHistoryLoading(false);
  };

  const autoSaveBriefing = async (result: any, currentTitle?: string) => {
    const tenant = subClient || (activeTenant && activeTenant !== "all" ? activeTenant : null);
    if (!tenant || !result) return;
    const entryTitle = currentTitle || title || "Sem título";
    try {
      const { data: last } = await supabase
        .from("briefing_history")
        .select("version")
        .eq("tenant_slug", tenant)
        .eq("title", entryTitle)
        .order("version", { ascending: false })
        .limit(1);
      const nextVersion = last?.[0]?.version ? last[0].version + 1 : 1;
      const { error } = await supabase.from("briefing_history").insert({
        tenant_slug: tenant,
        task_id: activeTask?.id || null,
        title: entryTitle,
        client: tenant,
        created_by: user?.id || null,
        version: nextVersion,
        briefing_data: result,
      });
      if (error) {
        console.error("Erro ao salvar histórico:", error);
        toast.error(`Histórico não salvo: ${error.message}`);
      }
    } catch (err: any) {
      console.error("Erro ao salvar histórico:", err);
      toast.error("Erro inesperado ao salvar histórico.");
    }
  };

  const saveBriefingVersion = async () => {
    if (!briefingResult) return;
    setIsSavingVersion(true);
    try {
      await autoSaveBriefing(briefingResult);
      toast.success("Nova versão salva no histórico.");
      if (activeTab === "historico") loadBriefingHistory();
    } catch {
      toast.error("Erro ao salvar versão.");
    } finally {
      setIsSavingVersion(false);
    }
  };

  const loadHistoryItem = (item: any) => {
    const data = item.briefing_data ?? {};
    // Garante que todos os campos tenham ao menos string vazia
    setBriefingResult({
      summary: data.summary ?? "",
      objective: data.objective ?? "",
      key_message: data.key_message ?? "",
      deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
      tech_requirements: data.tech_requirements ?? "",
      tone: data.tone ?? "",
      ...data,
    });
    setSelectedHistoryItem(item);
    setTitle(item.title ?? "");
    if (item.client && item.client !== item.tenant_slug) setSubClient(item.client);
    setActiveTab("escopo");
    toast.info(`Briefing v${item.version} carregado para edição.`);
  };

  // === FETCH E REALTIME DO SUPABASE ===
  const fetchTasks = async () => {
      let query = supabase.from('tasks').select('*').eq('department', 'atendimento');
      if (activeTenant && activeTenant !== "all") {
        query = query.eq('tenant', activeTenant);
      }
      const { data: atendimentoTasks } = await query;
      if (!atendimentoTasks) return;

      // Busca jobs filho (despachados para outros departamentos)
      const parentIds = atendimentoTasks.map((t: any) => t.id);
      let childData: any[] = [];
      if (parentIds.length > 0) {
        const { data } = await supabase.from('tasks').select('*').in('parent_task_id', parentIds);
        childData = data || [];
      }

      // Junta sem duplicatas (filho pode já estar em atendimento)
      const existingIds = new Set(atendimentoTasks.map((t: any) => t.id));
      const uniqueChildren = childData.filter((t: any) => !existingIds.has(t.id));
      setTasks([...atendimentoTasks, ...uniqueChildren]);
  };

  useEffect(() => {
      fetchTasks();
      const filter =
        activeTenant && activeTenant !== "all" ? `tenant=eq.${activeTenant}` : undefined;

      const channel = supabase
        .channel(`realtime:atendimento_tasks:${activeTenant || "all"}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter },
        () => { fetchTasks(); toast.info("Novo contato/solicitação recebida!"); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter },
        () => { fetchTasks(); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter },
        () => { fetchTasks(); })
        // captura jobs filho despachados (sem filtro de departamento)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' },
        () => { fetchTasks(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTab === "historico") loadBriefingHistory();
  }, [activeTab, activeTenant, subClient]);

  useEffect(() => {
    let cancelled = false;
    const loadTenants = async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name", { ascending: true });
      if (error || !data) return;

      let options = data.filter((t: any) => t.is_active !== false);
      if (tenantAccess.length > 0) {
        const allowed = new Set(tenantAccess.map((t) => t.tenantSlug));
        options = options.filter((t) => allowed.has(t.slug));
      } else if (user?.allowedTenants && !user.allowedTenants.includes("all")) {
        options = options.filter((t) => user.allowedTenants.includes(t.slug));
      }
      if (!cancelled) setTenantOptions(options);
    };
    loadTenants();
    return () => {
      cancelled = true;
    };
  }, [user?.allowedTenants?.join("|"), tenantAccess.map((t) => t.tenantSlug).join("|")]);

  const filteredTasks = useMemo(() => {
    if (!activeTenant || activeTenant === "all") return tasks;
    return tasks.filter(t => t.tenant === activeTenant);
  }, [tasks, activeTenant]);

  useEffect(() => { setSubClient(""); }, [activeTenant]);

  // === KANBAN HANDLERS ===
  const handleDrop = async (taskId: number, status: string) => {
      const previous = tasks;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      const res = await updateTaskStatus(taskId, status, editorName);
      if (res?.error) {
        setTasks(previous);
        toast.error(`Não foi possível atualizar o status: ${res.error.message || "sem permissão"}`);
        return;
      }
      await fetchTasks();
  };

  const handleDeleteTask = async (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id)); 
      await supabase.from('tasks').delete().eq('id', id);
      if(activeTask?.id === id) setActiveTask(null);
      toast.success("Ticket excluído permanentemente.");
  };

  const handleOpenEditTask = (task: any) => {
    setNewTaskData({
      title: task.title || "", description: task.description || "", formats: task.formats || [],
      status: task.status || "todo", assignees: task.assignees || [],
    });
    setEditingTaskId(task.id); setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    const safeTenant = subClient || (activeTenant && activeTenant !== "all" ? activeTenant : "");
    if (!safeTenant) return toast.error("Selecione um cliente antes de criar um ticket.");
    
    const payload = {
        tenant: safeTenant,
        department: 'atendimento',
        created_by: user?.id || null,
        updated_by: editorName,
        title: newTaskData.title, 
        description: newTaskData.description, 
        formats: newTaskData.formats,
        status: newTaskData.status, 
        assignees: newTaskData.assignees, 
        due_date: "Hoje"
    };

    if (editingTaskId) {
        await supabase.from('tasks').update(payload).eq('id', editingTaskId);
        toast.success("Ticket atualizado!");
    } else {
        await supabase.from('tasks').insert([payload]);
        toast.success("Novo ticket criado!");
    }
    
    fetchTasks(); setShowTaskModal(false); setEditingTaskId(null);
  };

  const toggleFormat = (fmt: string) => setNewTaskData(prev => ({ ...prev, formats: prev.formats.includes(fmt) ? prev.formats.filter(f => f !== fmt) : [...prev.formats, fmt] }));
  const toggleAssignee = (personId: string) => setNewTaskData(prev => ({ ...prev, assignees: prev.assignees.includes(personId) ? prev.assignees.filter(id => id !== personId) : [...prev.assignees, personId] }));

  // Clicar num card do Kanban joga os dados para o Agente IA trabalhar
  const handleSelectTaskForAgent = (task: any) => {
      setActiveTask(task);
      setTitle(task.title);
      setRawRequest(task.description || "");
      if(task.tenant) setSubClient(task.tenant);
      setActiveTab("escopo");
      toast.info("Dados do ticket carregados no Agente IA.");
  };

  const loadDeptMembers = async (tenantSlug: string) => {
    if (!tenantSlug) return;
    try {
      const { data: accessRows } = await supabase
        .from("user_tenants")
        .select("user_id, role")
        .eq("tenant_slug", tenantSlug);

      if (!Array.isArray(accessRows) || accessRows.length === 0) {
        setDeptMembers({});
        return;
      }

      const userIds = accessRows.map((r: any) => r.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,name,email")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.name || p.email || p.id])
      );

      const next: Record<string, { id: string; label: string }[]> = {};
      accessRows.forEach((row: any) => {
        const role = String(row.role || "");
        const userId = row.user_id;
        if (!userId) return;
        const label = profileMap.get(userId) || userId;
        const dept = ROLE_TO_DEPT[role];
        if (dept) {
          next[dept] = [...(next[dept] || []), { id: userId, label }];
        }
        if (role === "admin") {
          Object.keys(DEPT_ASSIGNEES).forEach((d) => {
            next[d] = [...(next[d] || []), { id: userId, label }];
          });
        }
      });

      setDeptMembers(next);
    } catch {
      setDeptMembers({});
    }
  };

  const loadChildTasks = async (taskId: number) => {
    setIsLoadingChildren(true);
    try {
      const { data } = await supabase
        .from("tasks")
        .select("id,title,department,assignees,status,tenant")
        .eq("parent_task_id", taskId);
      setChildTasks(Array.isArray(data) ? data : []);

      const ids = Array.isArray(data) ? data.map((t: any) => t.id) : [];
      if (ids.length > 0) {
        const { data: logs } = await supabase
          .from("task_reassignments")
          .select("*")
          .in("task_id", ids)
          .order("changed_at", { ascending: false });
        if (Array.isArray(logs)) {
          const map: Record<number, any> = {};
          for (const log of logs) {
            if (!map[log.task_id]) map[log.task_id] = log;
          }
          setReassignLogByTask(map);
        }
      } else {
        setReassignLogByTask({});
      }
    } finally {
      setIsLoadingChildren(false);
    }
  };

  useEffect(() => {
    if (activeTask?.id) {
      loadChildTasks(activeTask.id);
      const safeTenant = subClient || (activeTenant && activeTenant !== "all" ? activeTenant : "");
      if (safeTenant) loadDeptMembers(safeTenant);
    } else {
      setChildTasks([]);
    }
  }, [activeTask?.id]);

  const handleReassign = async (taskId: number, assigneeId: string) => {
    const current = childTasks.find((t) => t.id === taskId);
    const prevAssignee = (current?.assignees?.[0] as string) || null;
    const nextAssignees = assigneeId ? [assigneeId] : [];
    const { error } = await supabase
      .from("tasks")
      .update({ assignees: nextAssignees, updated_by: editorName })
      .eq("id", taskId);
    if (error) {
      toast.error("Não foi possível redirecionar o job.");
      return;
    }
    try {
      await supabase.from("task_reassignments").insert([{
        task_id: taskId,
        tenant_slug: current?.tenant || (subClient || activeTenant || ""),
        department: current?.department || null,
        from_assignee: prevAssignee,
        to_assignee: assigneeId || null,
        changed_by: user?.id || null,
        changed_at: new Date().toISOString(),
      }]);
    } catch {}
    setChildTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignees: nextAssignees } : t))
    );
    toast.success("Job redirecionado.");
  };
  

  // === IA AGENTE ===
  const handleGenerateBriefing = async () => {
      if (!title || !rawRequest) return toast.warning("Preencha o título e o pedido.");
      setIsGenerating(true);
      setStreamingPreview("");
      setBriefingResult(null);
      try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          const streamUrl = `${API_URL}/atendimento/agent/stream`;
          const res = await fetch(streamUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                  tenant_slug: subClient || activeTenant,
                  client: `${subClient || activeTenant} - ${subClient || activeTenant}`,
                  title,
                  raw_input: rawRequest,
                  flow: "atendimento",
                  objective,
                  target_audience: targetAudience,
                  cta,
                  restrictions,
                  boldness: parseInt(boldness),
                  references: references
              })
          });
          if (!res.ok || !res.body) throw new Error("Falha na conexão com o agente.");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let accumulated = "";
          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6).trim();
                  if (payload === "[DONE]") {
                      try {
                          const data = JSON.parse(accumulated);
                          const deliverables = getDeliverables(data?.deliverables);
                          const result = { ...data, deliverables };
                          setBriefingResult(result);
                          setStreamingPreview("");
                          setSelectedHistoryItem(null);
                          await autoSaveBriefing(result, title);
                          toast.success("Briefing Estratégico Gerado!");
                      } catch { toast.error("Erro ao processar briefing."); }
                      break;
                  }
                  try {
                      const { token: t, error } = JSON.parse(payload);
                      if (error) throw new Error(error);
                      if (t) { accumulated += t; setStreamingPreview(accumulated); }
                  } catch { /* ignora chunks malformados */ }
              }
          }
      } catch (error) {
          toast.error("Erro na inteligência do Agente.");
      } finally {
          setIsGenerating(false);
          setStreamingPreview("");
      }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user" as const, content: userMsg }];
    setChatHistory(newHistory);
    setIsChatLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${API_URL}/atendimento/chat-to-briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          tenant_slug: subClient || activeTenant,
          message: userMsg,
          history: chatHistory,
        }),
      });
      const data = await res.json();
      if (data.type === "briefing") {
        const d = data.data;
        setBriefingResult(d);
        if (d.title) setTitle(d.title);
        if (d.summary) setRawRequest(d.summary);
        setChatHistory([...newHistory, { role: "assistant", content: "Briefing extraído com sucesso. Revise ao lado." }]);
        toast.success("Briefing gerado pelo chat!");
      } else if (data.type === "question") {
        setChatHistory([...newHistory, { role: "assistant", content: data.text }]);
      }
    } catch {
      toast.error("Erro ao processar mensagem.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApproveBriefing = async () => {
    if (!briefingResult || !activeTenant) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const text = JSON.stringify(briefingResult, null, 2);
      await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          tenant_slug: activeTenant,
          output_type: "briefing",
          approved_text: text,
          input_summary: title,
          rating: 5,
        }),
      });
      toast.success("Briefing salvo como referência para futuras gerações.");
    } catch { /* silencia — feedback é best-effort */ }
  };

 // 1. CLONA O TICKET PARA A FILA DE JOBS DA CRIAÇÃO (todo)
  const handleSendToProduction = async (targetDepartment = 'redacao') => {
      if (!activeTask?.id) return toast.error("Nenhum ticket ativo selecionado.");
      if (!briefingResult) return toast.warning("Gere o briefing com a IA antes de enviar.");

      try {
          const dataHoje = new Date().toLocaleDateString('pt-BR');
          const textoFormatado = `Data: ${dataHoje}
Resumo: ${briefingResult.summary}
Tom: ${briefingResult.tone}
Objetivo: ${briefingResult.objective}
Mensagem Central: ${briefingResult.key_message}
Entregáveis:
${getDeliverables(briefingResult?.deliverables).map((item: string) => `  - ${item}`).join('\n')}
Requisitos Técnicos: ${briefingResult.tech_requirements}`.trim();

          const payloadCopy = {
              tenant: activeTask.tenant || 'mugo',
              created_by: user?.id || null,
              title: activeTask.title + ` (${targetDepartment.toUpperCase()})`, 
              description: textoFormatado,
              formats: activeTask.formats || [],
              status: 'todo', // 🔥 MUDANÇA AQUI: Entra na "Fila de Jobs" do destino
              assignees: activeTask.assignees || [],
              due_date: activeTask.due_date || "Hoje",
              department: targetDepartment 
          };

          const { error } = await supabase.from('tasks').insert([payloadCopy]);
          if (error) throw error;

          toast.success(`Cópia enviada para a Fila de ${targetDepartment.toUpperCase()}!`);

      } catch (err: any) {
          toast.error(`Erro ao transferir o job: ${err.message}`);
      }
  };

  // 2. MOVE O TICKET ORIGINAL DO ATENDIMENTO PARA "NA PAUTA" (doing)
  const handleArchiveAtendimento = async () => {
      if (!activeTask?.id) return;
      
      // Atualiza para 'doing' no banco
      await supabase.from('tasks').update({ status: 'doing' }).eq('id', activeTask.id);
      
      toast.success("Job distribuído! Movido para Na Pauta.");
      
      //  Move o card para a coluna 'doing' visualmente
      setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: 'doing' } : t)); 
      
      setActiveTask(null);
      setRawRequest("");
      setTitle("");
  };
  

 // O destino deve ser passado dinamicamente pela UI, nunca hardcoded.
const handleDispatchJob = async (destinationDepartments: string[]) => {
    if (!briefingResult) {
        toast.error("Gere o briefing com a IA antes de enviar.");
        return;
    }
    if (!destinationDepartments.length) {
        toast.error("Selecione pelo menos um departamento.");
        return;
    }

    // Define qual marca/sub-cliente é o dono do job
    const targetTenant = subClient || (activeTenant && activeTenant !== "all" ? activeTenant : "");
    if (!targetTenant) return toast.error("Selecione um cliente antes de despachar.");

    try {
        const tasksToInsert = destinationDepartments.map((dept) => {
            const opt = DISPATCH_OPTIONS.find((o) => o.id === dept);
            const mappedDept = opt?.mapsTo || dept;
            return {
                tenant: targetTenant,
                department: mappedDept,
                parent_task_id: activeTask?.id || null,
                title: `[${opt?.label?.toUpperCase() || dept.toUpperCase()}] ${title}`,
                description: `Briefing estratégico processado pelo Atendimento.`,
                briefing_data: briefingResult,
                formats: activeTask?.formats || ["A definir"],
                status: "todo",
                assignees: [],
                due_date: "Urgente",
            };
        });

        const { error: insertError } = await supabase.from('tasks').insert(tasksToInsert);
        if (insertError) throw insertError;

        // Atualiza a tarefa original (Ticket de Atendimento) como concluída
        if (activeTask) {
            await supabase.from('tasks').update({
                status: 'doing',
                briefing_data: briefingResult
            }).eq('id', activeTask.id);
        }

        toast.success(`Job enviado com sucesso para: ${destinationDepartments.map(d => d.toUpperCase()).join(", ")}`);
        
        // Limpa o palco para o próximo atendimento
        setBriefingResult(null); 
        setActiveTask(null);
        setSelectedDepartments([]);
        fetchTasks(); // Atualiza o Kanban local

    } catch (err) {
        toast.error("Falha no roteamento do job.");
        console.error(err);
    }
};

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col h-screen overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 shrink-0 bg-zinc-950 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg"><MessageSquare className="w-6 h-6 text-blue-500" /></div>
            <h1 className="text-lg font-bold">Atendimento & CS</h1>
        </div>
        <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-200 bg-blue-600 px-3 py-1.5 rounded border border-blue-800 hover:text-white transition">
            <Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher a Pauta" : "Ver a Pauta"}
            {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </header>

      {/* COMPONENTE KANBAN UNIVERSAL */}
      <KanbanBoard 
            isExpanded={isKanbanExpanded}
            onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
            tasks={filteredTasks}
            activeTask={activeTask}
            onTaskSelect={handleSelectTaskForAgent} // Ao clicar, preenche o Agente IA
            onTaskDelete={handleDeleteTask}
            onTaskDrop={handleDrop}
            onTaskEdit={handleOpenEditTask}
            onNewTaskClick={(status) => { 
                setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] });
                setEditingTaskId(null); setShowTaskModal(true); 
            }}
      />

      

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black custom-scrollbar">
        
        {/* ÁREA DO AGENTE */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg w-fit">
                <TabsTrigger value="escopo" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 gap-2 text-xs h-8"><Wand2 className="w-3 h-3"/> Agente de Atendimento</TabsTrigger>
                <TabsTrigger value="historico" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 gap-2 text-xs h-8"><FileText className="w-3 h-3"/> Histórico de Briefings</TabsTrigger>
            </TabsList>

            <TabsContent value="escopo" className="animate-in fade-in slide-in-from-bottom-2">
    <div className="flex flex-col lg:flex-row gap-8">
        
        {/* COLUNA 1: ENTRADA DE PEDIDO (O CAOS) */}
        <div className="w-full lg:w-[380px] space-y-4">
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                <CardHeader className="pb-3 bg-zinc-950/50 border-b border-zinc-800">
                    <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500"/> Entrada de Pedido
                        </span>
                        <button
                          onClick={() => { setChatMode(!chatMode); setChatHistory([]); }}
                          className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-widest transition ${chatMode ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                        >
                          {chatMode ? "Modo Chat" : "Modo Form"}
                        </button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {chatMode ? (
                      <div className="flex flex-col gap-3">
                        <div className="min-h-48 max-h-64 overflow-y-auto space-y-2 bg-black rounded-xl p-3 border border-zinc-800">
                          {chatHistory.length === 0 && (
                            <p className="text-[11px] text-zinc-600 text-center mt-6">
                              Descreva o pedido do cliente em linguagem natural.<br/>
                              Ex: "O cliente quer um post de Instagram para lançar um novo produto..."
                            </p>
                          )}
                          {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] text-[11px] px-3 py-2 rounded-xl leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                          {isChatLoading && (
                            <div className="flex justify-start">
                              <div className="bg-zinc-800 text-zinc-400 text-[11px] px-3 py-2 rounded-xl flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay:"0ms"}}/>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay:"150ms"}}/>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay:"300ms"}}/>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-black border border-zinc-700 text-white text-xs rounded-lg px-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                            placeholder="Digite o pedido..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                            disabled={isChatLoading}
                          />
                          <Button onClick={handleChatSend} disabled={isChatLoading || !chatInput.trim()} className="h-9 px-3 bg-blue-600 hover:bg-blue-500">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                    <><div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Cliente</label>
                        <select
                          className="w-full bg-black border border-zinc-700 text-white h-9 text-xs rounded-md px-2"
                          value={subClient || ""}
                          onChange={(e) => setSubClient(e.target.value)}
                        >
                          <option value="">Selecionar cliente...</option>
                          {(tenantOptions.length ? tenantOptions : (user?.allowedTenants || []).map((slug) => ({ slug, name: slug }))).map((tenant) => (
                            <option key={tenant.slug} value={tenant.slug}>
                              {tenant.name || tenant.slug.toUpperCase()}
                            </option>
                          ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Objetivo</label>
                            <select className="w-full bg-black border border-zinc-700 text-white h-9 text-xs rounded-md px-2" value={objective} onChange={e => setObjective(e.target.value)}>
                                <option value="Conversão/Venda">Conversão/Venda</option>
                                <option value="Autoridade/Branding">Autoridade/Branding</option>
                                <option value="Educação/Informativo">Educação/Informativo</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Nível de Ousadia ({boldness})</label>
                            <input type="range" min="1" max="5" value={boldness} onChange={e => setBoldness(e.target.value)} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Público-Alvo</label>
                        <Input className="bg-black border-zinc-700 text-white h-9 text-xs" placeholder="Ex: Médicos, Jovens 18-25..." value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block italic text-blue-400">Pedido Bruto (Raw Input)</label>
                        <Textarea className="bg-black border-zinc-700 text-white min-h-[100px] text-xs leading-relaxed" placeholder="O que o cliente pediu originalmente..." value={rawRequest} onChange={e => setRawRequest(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">CTA Principal</label>
                            <Input className="bg-black border-zinc-700 text-white h-9 text-xs" placeholder="Ex: Clique no Link..." value={cta} onChange={e => setCta(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Restrições</label>
                            <Input className="bg-black border-zinc-700 text-white h-9 text-xs" placeholder="Ex: Não usar cor X..." value={restrictions} onChange={e => setRestrictions(e.target.value)} />
                        </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block flex items-center gap-2">
                          <LinkIcon className="w-3 h-3"/> Referências / Benchmark
                      </label>
                      <Input 
                          className="bg-black border-zinc-700 text-white h-9 text-xs" 
                          placeholder="Links ou marcas de referência (ex: Apple, Nike, Concorrente X)..." 
                          value={references} 
                          onChange={e => setReferences(e.target.value)} 
                      />
                  </div>
                    </div>

                    <Button onClick={handleGenerateBriefing} disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest h-12">
                        {isGenerating ? "Refinando Estratégia..." : "Gerar Briefing"} <Zap className="w-4 h-4 ml-2"/>
                    </Button>
                    </>) }
</CardContent>
            </Card>

            {activeTask && (
                <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                    <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Card Conectado</p>
                    <p className="text-xs text-zinc-300 truncate">{activeTask.title}</p>
                </div>
            )}
        </div>

        {/* COLUNA 2: REFINO TÉCNICO E DESPACHO (A CLAREZA) */}
        <div className="flex-1 space-y-6">
            {!briefingResult ? (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 p-10 text-zinc-600">
                    {streamingPreview ? (
                        <div className="w-full">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                Construindo briefing...
                            </p>
                            <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed font-mono max-h-100 overflow-y-auto">
                                {streamingPreview}
                            </pre>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-800">
                                <Wand2 className="w-8 h-8 opacity-20" />
                            </div>
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Aguardando Inteligência</h3>
                            <p className="text-[11px] text-center mt-2 max-w-70 leading-relaxed">
                                Selecione um card na pauta acima ou cole um pedido bruto para que a IA organize o escopo técnico.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
                    {/* ÁREA DE REFINO EDITÁVEL */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="bg-blue-600/10 border-b border-zinc-800 p-4 flex justify-between items-center">
                            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                <Edit3 className="w-4 h-4"/> Refino de Briefing
                                {selectedHistoryItem && (
                                  <span className="text-zinc-500 font-normal normal-case tracking-normal">
                                    — v{selectedHistoryItem.version} carregada
                                  </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-600/20 text-blue-400 border border-blue-700 text-[9px] uppercase font-black">
                                {selectedHistoryItem ? `v${selectedHistoryItem.version}` : "Nova geração"}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1"
                                onClick={saveBriefingVersion}
                                disabled={isSavingVersion}
                              >
                                {isSavingVersion ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
                                Salvar versão
                              </Button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Resumo da Peça</label>
                                    <Input
                                        className="bg-black border-zinc-800 text-zinc-200 font-bold"
                                        value={briefingResult.summary ?? ""}
                                        onChange={(e) => setBriefingResult({...briefingResult, summary: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Objetivo Estratégico</label>
                                    <Input
                                        className="bg-black border-zinc-800 text-zinc-200"
                                        value={briefingResult.objective ?? ""}
                                        onChange={(e) => setBriefingResult({...briefingResult, objective: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Conteúdo Principal / Mensagem Chave</label>
                                <Textarea
                                    className="bg-black border-zinc-800 text-zinc-300 min-h-[100px] text-sm leading-relaxed"
                                    value={briefingResult.key_message ?? ""}
                                    onChange={(e) => setBriefingResult({...briefingResult, key_message: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase text-blue-400">Entregáveis Esperados</label>
                                    <Textarea
                                        className="bg-black border-zinc-800 text-zinc-300 text-xs min-h-20 leading-relaxed"
                                        placeholder="Um entregável por linha"
                                        value={getDeliverables(briefingResult?.deliverables).join("\n")}
                                        onChange={(e) =>
                                            setBriefingResult({
                                                ...briefingResult,
                                                deliverables: e.target.value
                                                    .split("\n")
                                                    .map((s: string) => s.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase text-purple-400">Requisitos Técnicos</label>
                                    <Textarea
                                        className="bg-black border-zinc-800 text-zinc-400 text-xs min-h-[80px]"
                                        value={briefingResult.tech_requirements ?? ""}
                                        onChange={(e) => setBriefingResult({...briefingResult, tech_requirements: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BARRA DE DESPACHO ESTRATÉGICO */}
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                                <ArrowRight className="w-6 h-6 text-zinc-600"/>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Pronto para a Criação?</h4>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Selecione o destino para despachar o job</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-6">
                          {DISPATCH_OPTIONS.map((opt) => {
                            const isSelected = selectedDepartments.includes(opt.id);
                            return (
                              <Button
                                key={opt.id}
                                type="button"
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isSelected
                                    ? "bg-white text-black border-white"
                                    : "bg-zinc-900 text-zinc-200 border-zinc-800"
                                } hover:text-black hover:bg-white`}
                                onClick={() => {
                                  setSelectedDepartments((prev) =>
                                    prev.includes(opt.id) ? prev.filter((d) => d !== opt.id) : [...prev, opt.id]
                                  );
                                }}
                              >
                                {opt.id === "redacao" && <Edit3 className="w-3 h-3 mr-2" />}
                                {opt.id === "arte" && <Palette className="w-3 h-3 mr-2" />}
                                {opt.id === "producao" && <Briefcase className="w-3 h-3 mr-2" />}
                                {opt.id === "video" && <Video className="w-3 h-3 mr-2" />}
                                {opt.id === "social_media" && <Share2 className="w-3 h-3 mr-2" />}
                                {opt.label}
                              </Button>
                            );
                          })}

                          <Button
                            type="button"
                            className="text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white col-span-2"
                            onClick={() => handleDispatchJob(selectedDepartments)}
                          >
                            Enviar selecionados
                          </Button>
                          <Button
                            type="button"
                            className="text-[10px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white col-span-2"
                            onClick={handleApproveBriefing}
                            disabled={!briefingResult}
                            title="Salva este briefing como exemplo de referência para futuras gerações de IA"
                          >
                            Salvar como Referência
                          </Button>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-800/60 w-full">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[11px] font-bold text-zinc-400 uppercase">Redirecionar Jobs</h4>
                            {isLoadingChildren ? (
                              <span className="text-[10px] text-zinc-600">Carregando...</span>
                            ) : null}
                          </div>
                          {childTasks.length === 0 ? (
                            <div className="text-[10px] text-zinc-600">
                              Nenhum job enviado ainda para este atendimento.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {childTasks.map((t) => {
                                const team = deptMembers[t.department] || DEPT_ASSIGNEES[t.department] || [];
                                const lastLog = reassignLogByTask[t.id];
                                return (
                                  <div
                                    key={t.id}
                                    className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-white font-semibold">{t.title}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase">
                                          {t.department}
                                        </p>
                                      </div>
                                      <span className="text-[10px] text-zinc-500">
                                        {t.status}
                                      </span>
                                    </div>
                                    {lastLog ? (
                                      <div className="text-[10px] text-zinc-500">
                                        Última troca: {lastLog.from_assignee || "—"} → {lastLog.to_assignee || "—"} em {new Date(lastLog.changed_at).toLocaleDateString("pt-BR")}
                                      </div>
                                    ) : null}
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={(t.assignees?.[0] as string) || ""}
                                        onValueChange={(value) => handleReassign(t.id, value)}
                                      >
                                        <SelectTrigger className="h-8 bg-black border border-zinc-800 text-xs text-zinc-300">
                                          <SelectValue placeholder="Selecione o responsável" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {team.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                              {m.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 text-[10px] border-zinc-700 text-zinc-900 hover:bg-zinc-800"
                                        onClick={() => handleReassign(t.id, "")}
                                      >
                                        Limpar
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
</TabsContent>
            <TabsContent value="historico">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <History className="w-4 h-4 text-zinc-500"/> Histórico de Briefings
                  </h2>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-1" onClick={loadBriefingHistory} disabled={historyLoading}>
                    <RotateCcw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`}/> Atualizar
                  </Button>
                </div>

                {historyLoading ? (
                  <div className="flex items-center justify-center h-40 text-zinc-600 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin"/> Carregando...
                  </div>
                ) : briefingHistory.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl text-zinc-600 gap-2">
                    <FileText className="w-6 h-6 opacity-30"/>
                    <p className="text-xs">Nenhum briefing salvo ainda.</p>
                    <p className="text-[10px] text-zinc-700">Gere um briefing e ele aparecerá aqui automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {briefingHistory.map((item) => (
                      <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-zinc-600 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-zinc-200 truncate">{item.title}</span>
                            <Badge className="bg-zinc-800 text-zinc-400 text-[9px] shrink-0">v{item.version}</Badge>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate mb-2">
                            {item.briefing_data?.summary || "Sem resumo"}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/> {item.client || item.tenant_slug}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(item.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-500 gap-1" onClick={() => loadHistoryItem(item)}>
                            <Edit3 className="w-3 h-3"/> Carregar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] border-zinc-700 text-zinc-500 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800 gap-1"
                            onClick={async () => {
                              await supabase.from("briefing_history").delete().eq("id", item.id);
                              setBriefingHistory(prev => prev.filter(h => h.id !== item.id));
                              toast.success("Briefing removido do histórico.");
                            }}>
                            <Trash2 className="w-3 h-3"/> Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
        </Tabs>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#18181b] border border-zinc-800 p-8 rounded-2xl w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white"><Plus className="w-5 h-5 text-blue-500" /> {editingTaskId ? "Editar Ticket" : "Novo Ticket"}</h3>
            <div className="space-y-5">
              <div><label className="text-xs text-zinc-400 mb-1 block">Título *</label><input autoFocus className="w-full bg-black border border-blue-500 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]" value={newTaskData.title} onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") handleSaveTask(); }} /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Detalhes do Pedido</label><textarea className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-blue-500 focus:outline-none min-h-[100px] resize-none" value={newTaskData.description} onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })} /></div>
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
                    <button key={col.id} onClick={() => setNewTaskData({ ...newTaskData, status: col.id })} className={`text-xs border px-4 py-2 rounded-md transition font-medium ${newTaskData.status === col.id ? "bg-blue-600 border-blue-500 text-white" : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>{col.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Equipe de Atendimento</label>
                <div className="grid grid-cols-5 gap-2">
                  {EQUIPE.map((p) => {
                    const isSelected = newTaskData.assignees?.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => toggleAssignee(p.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition ${isSelected ? "bg-zinc-800 border-zinc-600" : "bg-black border-zinc-900 hover:border-zinc-800"}`}>
                        <img src={p.photoUrl} alt={p.label} className={`w-8 h-8 rounded-full object-cover ${isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black" : "opacity-50"}`} onError={(e) => { (e.target as any).style.display = "none"; }} />
                        <span className={`text-[9px] ${isSelected ? "text-white font-bold" : "text-zinc-600"}`}>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-zinc-800/50">
              <Button variant="ghost" className="text-white font-bold hover:bg-zinc-800" onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }}>Cancelar</Button>
              <Button onClick={handleSaveTask} className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-6">{editingTaskId ? "Salvar" : "Criar Ticket"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft, BarChart3, Bot, Briefcase, Calendar as CalendarIcon, CheckCircle2,
  ChevronLeft, ChevronRight, Copy, Edit3, FileSpreadsheet, Info, Layers, Layout,
  Plus, RefreshCcw, Send, Sparkles, Target, Trash2, TrendingUp, User, Video, Wand2, Zap,
  ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// IMPORTAÇÕES VITAIS DA BASE DE DADOS E COMPONENTES
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { KanbanBoard } from "../components/KanbanBoard";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const SOCIAL_CHAT_URL =
  import.meta.env.VITE_SOCIAL_CHAT_URL?.trim() || `${API_URL}/SocialMedia/chat`;

type Role = "user" | "assistant";

type EventItem = {
  id: number;
  clientId?: string;
  tenant_slug?: string;
  title: string;
  month: string;
  day: number;
};

type GridRow = {
  platform: string;
  pillar: string;
  w1: string;
  w2: string;
  w3: string;
  w4: string;
};

type DashboardData = {
  trends: any[];
  competitors: any[];
  insight: string;
};

const EQUIPE = [
  { id: "julia", label: "Julia", role: "Plan", photoUrl: "/equipe/julia.jpg" },
  { id: "danilo", label: "Danilo", role: "Art", photoUrl: "/equipe/danilo.jpg" },
  { id: "monica", label: "Mônica", role: "Copy", photoUrl: "/equipe/monica.jpg" },
];

const DEPARTAMENTOS = {
    'redacao': { label: 'Redação & Copy', equipe: ['Mônica', 'Lucas'] },
    'arte': { label: 'Direção de Arte', equipe: ['Danilo', 'Felipe'] },
    'producao': { label: 'Produção (Vídeo)', equipe: ['Rodrigo'] }
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEK_TO_DAY_MAP: Record<string, number> = { w1: 5, w2: 12, w3: 19, w4: 26 };
const TASK_FORMATS = ["Post Estático", "Carrossel", "Reels/TikTok", "Stories", "Artigo/Blog"];
const WEEK_DAY_OFFSETS = [0, 2, 4, 6];

// Colunas Padronizadas
const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Ideias / Briefing', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Em Produção', color: 'bg-blue-500' },
    { id: 'review', label: 'Aprovação', color: 'bg-orange-500' },
    { id: 'done', label: 'Agendado', color: 'bg-green-500' }
];

const INITIAL_CONTENT_GRID: GridRow[] = [
  { platform: "Instagram (Feed)", pillar: "", w1: "", w2: "", w3: "", w4: "" },
  { platform: "Instagram (Stories)", pillar: "", w1: "", w2: "", w3: "", w4: "" },
  { platform: "TikTok / Reels", pillar: "", w1: "", w2: "", w3: "", w4: "" },
  { platform: "LinkedIn", pillar: "", w1: "", w2: "", w3: "", w4: "" },
];

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

const getAuthHeaders = async (extra?: Record<string, string>) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function SocialMedia() {
  const [selectedYear] = useState(new Date().getFullYear());

  // --- CONTEXTO GLOBAL ---
  const { activeTenant, user } = useAuth();
  const editorName = user?.name || "Sistema";
  const tenantSlug =
    (activeTenant && activeTenant !== "all") ? activeTenant
    : (subClientFilter !== "Todos" ? subClientFilter : "");
  const [tenantOptions, setTenantOptions] = useState<{ slug: string; name: string }[]>([]);

  // --- FILTRO LOCAL (Projetos/Sub-marcas) ---
  const [subClientFilter, setSubClientFilter] = useState("Todos");

  useEffect(() => {
    let cancelled = false;
    const loadTenants = async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name", { ascending: true });
      if (error || !data) return;
      if (!cancelled) setTenantOptions(data.filter((t: any) => t.is_active !== false));
    };
    loadTenants();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- SUPABASE & DATA STATES ---
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [contentMonthIndex, setContentMonthIndex] = useState(new Date().getMonth());
  const [tacticalMonthIndex, setTacticalMonthIndex] = useState(new Date().getMonth());
  const [contentGrid, setContentGrid] = useState<GridRow[]>(INITIAL_CONTENT_GRID);
  // Alias defensivo para evitar referências antigas a "grid"
  const grid = contentGrid;
  const [dashboardData, setDashboardData] = useState<DashboardData>({ trends: [], competitors: [], insight: "" });

  // --- CHAT STATE ---
  const [chatHistory, setChatHistory] = useState<{ role: Role; content: string }[]>([
    { role: "assistant", content: "Olá! Como posso ajudar na estratégia de Social Media hoje?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- MODAL STATES ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState<{
    title: string; description: string; formats: string[]; tone: string; status: string; assignees: string[];
  }>({ title: "", description: "", formats: [], tone: "Profissional", status: "todo", assignees: [] });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // Modal de Disparo de Conteúdo
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedContentForDispatch, setSelectedContentForDispatch] = useState<any>(null);
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedPeopleBySector, setSelectedPeopleBySector] = useState<Record<string, string[]>>({});
  const [sendToApproval, setSendToApproval] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventData, setNewEventData] = useState<{ platform: string; content: string; day: string; weekKey: string }>({
    platform: "",
    content: "",
    day: "",
    weekKey: "w1",
  });
  
  const [activeContext, setActiveContext] = useState<{ type: "kanban" | "chat"; text: string; meta?: any } | null>(null);
  const draftSaveTimerRef = useRef<number | null>(null);

  // --- FETCH SUPABASE TASKS ---
  const fetchTasks = async () => {
      let query = supabase.from('tasks').select('*').eq('department', 'social_media');
      if (activeTenant && activeTenant !== "all") {
        query = query.eq('tenant', activeTenant);
      }
      const { data } = await query;
      if (data) setTasks(data);
  };

  useEffect(() => {
      fetchTasks();
      const channel = supabase.channel(`realtime:social_media_tasks:${activeTenant || "all"}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: "department=eq.social_media" }, 
        () => { fetchTasks(); toast.info("Novo Job na fila de Social!"); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: "department=eq.social_media" },
        () => { fetchTasks(); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter: "department=eq.social_media" },
        () => { fetchTasks(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); }
  }, [activeTenant]);

  // FILTRO DUPLO: Tenant Global + SubClient do Social Media
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (activeTenant && activeTenant !== "all") {
        filtered = filtered.filter(t => t.tenant === activeTenant || t.tenant === subClientFilter);
    }
    if (subClientFilter !== "Todos") {
        filtered = filtered.filter(t => t.tenant === subClientFilter);
    }
    return filtered;
  }, [tasks, activeTenant, subClientFilter]);

  useEffect(() => {
    if (!activeTask?.id) return;
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return;
    supabase
      .from("task_drafts")
      .select("state")
      .eq("tenant_slug", safeTenant)
      .eq("task_id", activeTask.id)
      .eq("department", "social_media")
      .maybeSingle()
      .then(({ data }) => {
        const saved = data?.state as any;
        if (!saved) return;
        if (saved.grid) setContentGrid(saved.grid);
        if (saved.month !== undefined && Number.isFinite(saved.month)) {
          setContentMonthIndex(saved.month);
        }
        if (saved.chatHistory) setChatHistory(saved.chatHistory);
        if (saved.chatInput !== undefined) setChatInput(saved.chatInput);
        if (saved.activeContext) setActiveContext(saved.activeContext);
      });
  }, [activeTenant, activeTask?.id]);

  useEffect(() => {
    if (!activeTask?.id) return;
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return;
    const stateToSave = {
      grid: contentGrid,
      month: contentMonthIndex,
      chatHistory,
      chatInput,
      activeContext,
    };
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(async () => {
      await supabase.from("task_drafts").upsert(
        {
          tenant_slug: safeTenant,
          task_id: activeTask.id,
          department: "social_media",
          state: stateToSave,
          updated_at: new Date().toISOString(),
          created_by: user?.id || null,
        },
        { onConflict: "tenant_slug,task_id,department" }
      );
    }, 800);
  }, [contentGrid, contentMonthIndex, chatHistory, chatInput, activeContext, activeTenant, activeTask?.id, user?.id]);

  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    return events.filter((e) => subClientFilter === "Todos" || e.clientId === subClientFilter);
  }, [events, subClientFilter]);

  // -----------------------------
  // 1) LOAD OUTROS DADOS (API LOCAL)
  // -----------------------------
  const loadEventsFromAPI = async (slug: string, year: number, monthIndex: number) => {
    try {
      const res = await fetch(
        `${API_URL}/SocialMedia/events?tenant_slug=${slug}&year=${year}&month=${monthIndex + 1}`,
        { headers: await getAuthHeaders() }
      );
      if (!res.ok) return;
      const data = await safeJson(res);
      if (data && Array.isArray(data.events)) setEvents(data.events);
    } catch {}
  };

  const loadGridFromAPI = async (slug: string, year: number, monthIndex: number) => {
    try {
      const res = await fetch(
        `${API_URL}/SocialMedia/grid?tenant_slug=${slug}&year=${year}&month=${monthIndex + 1}`,
        { headers: await getAuthHeaders() }
      );
      if (!res.ok) return;
      const data = await safeJson(res);
      if (data && Array.isArray(data.grid)) setContentGrid(data.grid);
    } catch {}
  };

  const saveEventsToApi = async (slug: string, year: number, monthIndex: number, nextEvents: EventItem[]) => {
    await fetch(`${API_URL}/SocialMedia/events/save`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        tenant_slug: slug,
        year,
        month: monthIndex + 1,
        events: nextEvents,
      }),
    });
  };

  const buildEventsFromGrid = (tenantSlug: string, year: number, monthIndex: number, gridRows: GridRow[]) => {
    const events: EventItem[] = [];
    const monthName = MONTHS[monthIndex];
    const weekKeys = ["w1", "w2", "w3", "w4"] as const;
    const counters: Record<string, number> = { w1: 0, w2: 0, w3: 0, w4: 0 };
    gridRows.forEach((row) => {
      weekKeys.forEach((weekKey) => {
        const content = (row as any)?.[weekKey];
        if (!content || String(content).trim() === "-" || String(content).trim() === "") return;
        const offsetIndex = counters[weekKey] || 0;
        const baseDay = WEEK_TO_DAY_MAP[weekKey] || 1;
        const day = baseDay + (WEEK_DAY_OFFSETS[offsetIndex % WEEK_DAY_OFFSETS.length] || 0);
        counters[weekKey] = offsetIndex + 1;
        events.push({
          id: Date.now() + events.length,
          clientId: tenantSlug,
          tenant_slug: tenantSlug,
          title: `${row.platform || "Geral"}: ${String(content).trim()}`,
          month: monthName,
          day,
        });
      });
    });
    return events;
  };

  const fetchDashboard = async (slug: string) => {
    try {
      setDashboardData({ trends: [], competitors: [], insight: "Carregando análises..." });
      const res = await fetch(`${API_URL}/planning/dashboard-data`, {
        method: "POST",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tenant_slug: slug, current_metrics: {} }),
      });
      if (!res.ok) throw new Error("Offline");
      const data = await safeJson(res);
      setDashboardData({
        trends: data?.trends || [], competitors: data?.competitors || [], insight: data?.performance_insight || "",
      });
    } catch {
      setDashboardData({ trends: [], competitors: [], insight: "Conexão com IA indisponível (Offline)." });
    }
  };

  useEffect(() => {
    setSubClientFilter("Todos");
    if (!tenantSlug) return;
    loadEventsFromAPI(tenantSlug, selectedYear, contentMonthIndex);
    loadGridFromAPI(tenantSlug, selectedYear, contentMonthIndex);
    fetchDashboard(tenantSlug);
  }, [tenantSlug, selectedYear, contentMonthIndex]);

  // AUTO-SAVE DO GRID (MANTIDO)
  const gridSaveTimerRef = useRef<number | null>(null);
  const lastGridSavedRef = useRef<string>("");

  useEffect(() => {
    const serialized = JSON.stringify(contentGrid);
    if (serialized === lastGridSavedRef.current) return;
    if (gridSaveTimerRef.current) window.clearTimeout(gridSaveTimerRef.current);

    gridSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch(`${API_URL}/SocialMedia/grid/save`, {
          method: "POST",
          headers: await getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ tenant_slug: tenantSlug, year: selectedYear, month: contentMonthIndex + 1, grid: contentGrid }),
        });
      } catch {}
      lastGridSavedRef.current = serialized;
    }, 900);

    return () => { if (gridSaveTimerRef.current) window.clearTimeout(gridSaveTimerRef.current); };
  }, [contentGrid, tenantSlug, selectedYear, contentMonthIndex]);

  // -----------------------------
  // 2) KANBAN HANDLERS (SUPABASE)
  // -----------------------------
  const handleDrop = async (taskId: number, status: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      await updateTaskStatus(taskId, status, editorName);
      await fetchTasks();
  };

  const handleDeleteTask = async (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id)); 
      await supabase.from('tasks').delete().eq('id', id);
      if(activeTask?.id === id) setActiveTask(null);
      toast.success("Job removido.");
  };

  const handleOpenEditTask = (task: any) => {
      setNewTaskData({
          title: task.title || "", description: task.description || "", formats: task.formats || [],
          tone: task.tone || "Profissional", status: task.status || "todo", assignees: task.assignees || [],
      });
      setEditingTaskId(task.id); setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    
    // Resolve o Tenant a gravar
    let taskTenant = subClientFilter !== "Todos"
      ? subClientFilter
      : (activeTenant && activeTenant !== "all" ? activeTenant : "");
    if (!taskTenant) return toast.error("Selecione um cliente antes de criar o job.");

    const payload = {
        tenant: taskTenant,
        department: 'social_media',
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
        toast.success("Tarefa atualizada!");
    } else {
        await supabase.from('tasks').insert([payload]);
        toast.success("Nova tarefa criada!");
    }
    
    fetchTasks(); setShowTaskModal(false); setEditingTaskId(null);
  };

  const toggleFormat = (fmt: string) => setNewTaskData(prev => ({ ...prev, formats: prev.formats.includes(fmt) ? prev.formats.filter(f => f !== fmt) : [...prev.formats, fmt] }));
  const toggleAssignee = (personId: string) => setNewTaskData(prev => ({ ...prev, assignees: prev.assignees.includes(personId) ? prev.assignees.filter(id => id !== personId) : [...prev.assignees, personId] }));

  const handleUseTaskAsContext = (task: any) => {
    setActiveTask(task);
    setActiveContext({ type: "kanban", text: task.title, meta: { formats: task.formats, tone: task.tone } });
    toast.success("Pauta definida para o Chat!");
  };

  // -----------------------------
  // 3) HELPERS DA UI (MANTIDOS)
  // -----------------------------
  const handleInputResize = (e: any) => {
    setChatInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const updateContentCell = (rowIndex: number, field: keyof GridRow, value: string) => {
    setContentGrid((prev) => {
      const next = [...prev];
      if (!next[rowIndex]) return prev;
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  const updateEventDay = (eventId: number, newDay: string) => {
  const dayNum = parseInt(newDay, 10);
  if (Number.isNaN(dayNum)) return;

  // Atualiza UI imediatamente
  setEvents((prev) => prev.map((ev) => (ev.id === eventId ? { ...ev, day: dayNum } : ev)));

  // Debounce: evita bater API a cada tecla
  const timers = eventSaveTimersRef.current;
  if (timers[eventId]) window.clearTimeout(timers[eventId]);

  timers[eventId] = window.setTimeout(() => {
    saveEventDayToAPI(eventId, dayNum);
  }, 600);
};

  const getDayOfWeek = (day: number) => {
    const date = new Date(selectedYear, contentMonthIndex, day);
    return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  };

  const getSuggestedDayForWeek = (startDay: number, index: number) => {
    const daysInMonth = new Date(selectedYear, contentMonthIndex + 1, 0).getDate();
    const offset = WEEK_DAY_OFFSETS[index % WEEK_DAY_OFFSETS.length] || 0;
    let suggested = startDay + offset;
    while (suggested > daysInMonth) suggested -= 7;
    if (suggested < 1) suggested = Math.max(1, startDay);
    return suggested;
  };

  const handleCopyText = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copiado!"); };


  const eventSaveTimersRef = useRef<Record<number, number>>({});

const saveEventDayToAPI = async (eventId: number, day: number) => {
  try {
    await fetch(`${API_URL}/SocialMedia/events/update-day`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        year: selectedYear,
        month: contentMonthIndex + 1,
        event_id: eventId,
        day,
      }),
    });
  } catch {
    toast.error("Não consegui salvar o dia do evento.");
  }
};

  // -----------------------------
  // 4) CHAT & IA
  // -----------------------------
  const handleChatSubmit = async (overrideMessage?: string, isInternalCommand = false) => {
  const messageToSend = overrideMessage || chatInput;
  if (!messageToSend.trim()) return;

  let historyToSend = chatHistory;

  if (!isInternalCommand) {
    // Monta o próximo histórico localmente (inclui a msg atual)
    const userMsg = { role: "user" as const, content: messageToSend };
    historyToSend = [...chatHistory, userMsg];

    // Atualiza UI normalmente
    setChatInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setChatHistory(historyToSend);
  } else {
    // Comando interno: você já está enviando sem histórico (mantém)
    historyToSend = [];
  }

  setIsGeneratingSuggestions(true);
  setIsChatLoading(true);

  try {
    const res = await fetch(SOCIAL_CHAT_URL, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message: messageToSend,
        history: historyToSend,
        extra_context: JSON.stringify(contentGrid),
        tenant_slug: tenantSlug,
      }),
    });

    if (!res.ok) throw new Error("Erro API");

    const data = await safeJson(res);
    const responseText = data?.response ?? "Erro: resposta vazia.";

    if (isInternalCommand) {
      try {
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const newGrid = JSON.parse(cleanJson);
        if (Array.isArray(newGrid)) {
          setContentGrid(newGrid);
          toast.success("Grid Gerado!");
        }
      } catch {
        toast.error("Erro formato IA");
        setChatHistory((prev) => [...prev, { role: "assistant", content: responseText }]);
      }
    } else {
      setChatHistory((prev) => [...prev, { role: "assistant", content: responseText }]);
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }
  } catch {
    setChatHistory((prev) => [...prev, { role: "assistant", content: "Erro conexão." }]);
  } finally {
    setIsChatLoading(false);
    setIsGeneratingSuggestions(false);
  }
};

const handleEditChatMessage = (index: number, newText: string) => {
  setChatHistory((prev) =>
    prev.map((msg, i) =>
      i === index ? { ...msg, content: newText } : msg
    )
  );
};

const generateContentSuggestions = async () => {
  if (!tenantSlug) {
    toast.error("Selecione um cliente antes de gerar o grid.");
    return;
  }
  setIsGeneratingSuggestions(true);

  try {
    const res = await fetch(`${API_URL}/SocialMedia/grid/generate`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        context: activeContext ? activeContext.text : "",
      }),
    });

    const data = await safeJson(res);
    if (data?.grid && Array.isArray(data.grid)) {
      setContentGrid(data.grid);
      toast.success("Grid Gerado!");
    } else {
      toast.error("Grid inválido.");
    }
  } catch {
    toast.error("Erro ao gerar com IA.");
  } finally {
    setIsGeneratingSuggestions(false);
  }
};

  // -----------------------------
  // 5) PIPELINE DE DISPARO (O ENCANAMENTO)
  // -----------------------------
  const openSendModal = (event: EventItem) => {
    const [platform, content] = event.title.includes(":") ? event.title.split(": ") : ["Geral", event.title];
    setSelectedContentForDispatch({ content, platform: platform || "Geral", eventId: event.id });
    setSelectedSector("");
    setSelectedPeople([]);
    setSelectedSectors([]);
    setSelectedPeopleBySector({});
    setSendToApproval(false);
    setShowSendModal(true);
  };

  const openNewEventModalFromGrid = (platform: string, content: string, weekKey: string, rowIndex: number) => {
    const baseDay = WEEK_TO_DAY_MAP[weekKey] || 1;
    const offset = WEEK_DAY_OFFSETS[rowIndex % WEEK_DAY_OFFSETS.length] || 0;
    const dayDefault = String(baseDay + offset);
    setNewEventData({
      platform: platform || "Geral",
      content: content || "",
      day: dayDefault,
      weekKey,
    });
    setShowNewEventModal(true);
  };

  const handleCreateNewEvent = async () => {
    const tenantSlug = subClientFilter !== "Todos"
      ? subClientFilter
      : (activeTenant && activeTenant !== "all" ? activeTenant : "");
    if (!tenantSlug) return toast.error("Selecione um cliente.");
    const dayNum = Number(newEventData.day);
    if (!Number.isFinite(dayNum) || dayNum <= 0) return toast.error("Defina um dia válido.");
    const title = `${newEventData.platform || "Geral"}: ${newEventData.content || "Novo conteúdo"}`;
    const newEvent: EventItem = {
      id: Date.now(),
      clientId: tenantSlug,
      tenant_slug: tenantSlug,
      title,
      month: MONTHS[tacticalMonthIndex],
      day: dayNum,
    };
    const nextEvents = [...events, newEvent];
    setEvents(nextEvents);
    try {
      await saveEventsToApi(tenantSlug, selectedYear, tacticalMonthIndex, nextEvents);
      toast.success("Card criado no calendário.");
      openSendModal(newEvent);
    } catch {
      toast.error("Erro ao salvar card.");
    } finally {
      setShowNewEventModal(false);
    }
  };

  const handleSaveCalendar = async () => {
    const tenantSlug = subClientFilter !== "Todos"
      ? subClientFilter
      : (activeTenant && activeTenant !== "all" ? activeTenant : "");
    if (!tenantSlug) return toast.error("Selecione um cliente.");
    try {
      await fetch(`${API_URL}/SocialMedia/grid/save`, {
        method: "POST",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          year: selectedYear,
          month: tacticalMonthIndex + 1,
          grid: contentGrid,
        }),
      });
      const nextEvents = buildEventsFromGrid(tenantSlug, selectedYear, tacticalMonthIndex, contentGrid);
      setEvents(nextEvents);
      await saveEventsToApi(tenantSlug, selectedYear, tacticalMonthIndex, nextEvents);
      setContentMonthIndex(tacticalMonthIndex);
      toast.success("Calendário Tático salvo.");
    } catch {
      toast.error("Erro ao salvar calendário tático.");
    }
  };

  const handleSendPlannerToApproval = async () => {
    const tenantSlug = subClientFilter !== "Todos"
      ? subClientFilter
      : (activeTenant && activeTenant !== "all" ? activeTenant : "");
    if (!tenantSlug) return toast.error("Selecione um cliente.");
    const payload = {
      month: MONTHS[tacticalMonthIndex],
      year: selectedYear,
      planner: {
        chatHistory,
        activeContext,
        grid: contentGrid,
      },
    };
    const { data: approvalTask, error: approvalTaskError } = await supabase
      .from("tasks")
      .insert([
        {
          tenant: tenantSlug,
          department: "atendimento",
          title: `Aprovação do Planner: ${MONTHS[tacticalMonthIndex]} ${selectedYear}`,
          description: `Planejador de Conteúdo (${MONTHS[tacticalMonthIndex]} ${selectedYear})`,
          status: "review",
          formats: ["Planejador de Conteúdo"],
          created_by: user?.id || null,
          updated_by: user?.name || "Sistema",
        },
      ])
      .select("id")
      .single();
    if (approvalTaskError) return toast.error(approvalTaskError.message || "Erro ao criar job de aprovação.");
    const { error } = await supabase.from("approvals").insert([
      {
        tenant_slug: tenantSlug,
        status: "pending",
        type: "planner",
        task_id: approvalTask?.id || null,
        metadata: {
          planner_payload: payload,
        },
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) return toast.error(error.message || "Erro ao enviar para aprovação.");
    toast.success("Planejador de Conteúdo enviado para aprovação e criado na pauta do Atendimento.");
  };

  const handleDispatchJob = async () => {
      if (!selectedContentForDispatch) return;
      if (!selectedSectors.length) return toast.error("Selecione ao menos um departamento.");
      const missingPeople = selectedSectors.filter((s) => !(selectedPeopleBySector[s]?.length));
      if (missingPeople.length) return toast.error("Selecione responsáveis em todos os departamentos.");
      
      const targetTenant = subClientFilter !== "Todos"
        ? subClientFilter
        : (activeTenant && activeTenant !== "all" ? activeTenant : "");
      if (!targetTenant) {
        toast.error("Selecione um cliente antes de despachar.");
        return;
      }

      try {
          const insertedIds: number[] = [];
          const dispatchStatus = sendToApproval ? "review" : "doing";
          for (const sector of selectedSectors) {
            const people = selectedPeopleBySector[sector] || [];
            const newDispatchedTask = {
                tenant: targetTenant,
                department: sector, // 'redacao' | 'arte' | 'producao'
                title: `Post Social: ${selectedContentForDispatch.platform}`,
                description: `Conteúdo da Pauta:\n"${selectedContentForDispatch.content}"\n\nContexto extra: Favor produzir os assets para postagem.`,
                formats: ["Post Social Media"],
                status: dispatchStatus,
                assignees: people.map((p) => p.toLowerCase()),
                due_date: "Semana que vem"
            };
            const { data: inserted, error } = await supabase
              .from('tasks')
              .insert([newDispatchedTask])
              .select('id')
              .single();
            if (error) throw error;
            if (inserted?.id) {
              insertedIds.push(inserted.id);
              const assignmentRows = people.map((person) => ({
                task_id: inserted.id,
                tenant_slug: targetTenant,
                department: sector,
                assignee: person.toLowerCase(),
                assigned_by: user?.id || null,
                role: 'owner',
              }));
              const { error: assignError } = await supabase.from('task_assignments').insert(assignmentRows);
              if (assignError) throw assignError;
            }
          }

          if (sendToApproval) {
            const { error: approvalError } = await supabase.from("approvals").insert([
              {
                tenant_slug: targetTenant,
                status: "pending",
                type: "planner",
                task_id: insertedIds[0] || null,
                metadata: {
                  source: "social_media",
                  platform: selectedContentForDispatch.platform,
                  content: selectedContentForDispatch.content,
                  job_ids: insertedIds,
                },
                created_at: new Date().toISOString(),
              },
            ]);
            if (approvalError) throw approvalError;
          }

          const deptLabels = selectedSectors.map((s) => DEPARTAMENTOS[s as keyof typeof DEPARTAMENTOS].label);
          toast.success(`Job despachado para ${deptLabels.join(", ")}.`);
      } catch (error) {
          toast.error("Erro ao enviar para o Banco de Dados.");
      }
      
      setShowSendModal(false);
  };

  



  // -----------------------------
  // MAIN UI
  // -----------------------------
  return (
    <div className="h-screen bg-black text-white font-sans flex flex-col overflow-hidden">
      
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-black shrink-0 z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold flex items-center gap-2 text-white">
            <span className="bg-gradient-to-br from-purple-600 to-pink-600 w-8 h-8 rounded flex items-center justify-center text-sm">#</span>
            Social Media
          </h1>

          <div className="relative group">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 cursor-pointer transition">
              <span className={`w-3 h-3 rounded-full bg-blue-500`}></span>
              <select
                value={subClientFilter}
                onChange={(e) => setSubClientFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="Todos">Todos os Projetos da Marca</option>
                {(activeTenant && activeTenant !== "all"
                  ? tenantOptions.filter((t) => t.slug === activeTenant)
                  : tenantOptions
                ).map((t) => (
                  <option key={t.slug} value={t.slug} className="bg-zinc-900 text-white">
                    {t.name || t.slug.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3 h-3 text-zinc-500 rotate-90" />
            </div>
          </div>
        </div>
        <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-900 hover:text-white transition-all bg-yellow-400 px-3 py-1.5 rounded border border-zinc-800">
            <Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher Pauta" : "Ver Pauta"}
            {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
  
      

        {/* KANBAN UNIVERSAL INTEGRADO */}
        <KanbanBoard 
            isExpanded={isKanbanExpanded}
            onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
            tasks={filteredTasks}
            activeTask={activeTask}
            onTaskSelect={(task) => handleUseTaskAsContext(task)} // Puxa p/ Chat
            onTaskDelete={handleDeleteTask}
            onTaskDrop={handleDrop}
            onTaskEdit={handleOpenEditTask}
            onNewTaskClick={(status) => { 
                setNewTaskData({ title: "", description: "", formats: [], tone: "Profissional", status, assignees: [] });
                setEditingTaskId(null); setShowTaskModal(true); 
            }}
        />

        {/* CALENDÁRIO TÁTICO */}
        <section className="bg-black border border-zinc-800 rounded-2xl p-6 overflow-hidden shadow-2xl relative">
          <div className="flex justify-between items-center mb-6 mt-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-900/30 p-2 rounded-lg"><FileSpreadsheet className="w-5 h-5 text-purple-500" /></div>
              <div>
                <h3 className="font-bold text-lg text-white">Calendário Tático</h3>
                <p className="text-xs text-zinc-500 flex items-center gap-1"><Info className="w-3 h-3" /> Grid de pautas. Copie e cole na estrutura.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Salvar no mês</span>
                <select
                  value={tacticalMonthIndex}
                  onChange={(e) => setTacticalMonthIndex(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 bg-emerald-900/20">
                Salva em {MONTHS[tacticalMonthIndex]}
              </div>
              <Button size="sm" className="text-white font-bold text-xs gap-2 bg-gradient-to-r from-purple-600 to-blue-600" onClick={generateContentSuggestions} disabled={isGeneratingSuggestions}><Sparkles className="w-3 h-3" /> Gerar com IA</Button>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase w-48 bg-zinc-900/50">Canal</th>
                  <th className="p-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase w-32 bg-zinc-900/30">Pilar</th>
                  <th className="p-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase">Sem 1</th>
                  <th className="p-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase">Sem 2</th>
                  <th className="p-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase">Sem 3</th>
                  <th className="p-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase">Sem 4</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(contentGrid) && contentGrid.map((row: any, idx: number) => (
                  <tr key={idx} className="group hover:bg-zinc-900/30 transition">
                    <td className="p-4 border-b border-zinc-800 text-sm font-bold text-purple-300 bg-zinc-950">{row?.platform}</td>
                    <td className="p-2 border-b border-zinc-800 border-l border-zinc-800/50"><input className="w-full bg-zinc-900/50 text-xs text-blue-300 font-bold p-2 rounded border-transparent transition text-center focus:outline-none" value={row?.pillar || ""} onChange={(e) => updateContentCell(idx, "pillar", e.target.value)} /></td>
                    {(["w1", "w2", "w3", "w4"] as const).map((week) => (
                      <td key={week} className="p-2 border-b border-zinc-800 border-l border-zinc-800/50 relative group/cell">
                        <div className="relative min-h-[50px]">
                          <textarea className="w-full h-full bg-transparent text-xs text-gray-300 p-2 rounded hover:bg-zinc-800 focus:bg-black focus:border-purple-500 focus:outline-none border border-transparent transition resize-none" rows={3} value={row ? row[week] || "" : ""} onChange={(e) => updateContentCell(idx, week, e.target.value)} placeholder="-" />
                          {row && row[week] && row[week] !== "-" && (
                            <div className="absolute right-1 top-2 flex gap-1 opacity-0 group-hover/cell:opacity-100 transition">
                              <button onClick={() => handleCopyText(row[week])} className="text-zinc-600 hover:text-white" title="Copiar"><Copy className="w-3 h-3" /></button>
                              <button onClick={() => openNewEventModalFromGrid(row?.platform || "Geral", row[week], week, idx)} className="text-zinc-600 hover:text-white" title="Criar Card"><Plus className="w-3 h-3" /></button>
                              <button onClick={() => openSendModal({ id: Date.now(), title: `${row?.platform || "Geral"}: ${row[week]}`, day: WEEK_TO_DAY_MAP[week], month: MONTHS[contentMonthIndex], clientId: activeTenant || "" })} className="text-zinc-600 hover:text-white" title="Despachar"><Send className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CHAT */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-0 overflow-hidden shadow-2xl mb-6 flex flex-col h-[400px]">
          <div className="p-4 border-b border-zinc-800 bg-black flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
              <div><h3 className="font-bold text-sm text-white">Planejador de Conteúdo</h3><p className="text-[10px] text-zinc-500">Agente Estratégico</p></div>
            </div>
            {activeContext && (
                <div className="bg-blue-900/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded text-xs flex items-center gap-2">
                    <Target className="w-3 h-3"/> Pauta Ativa: {activeContext.text}
                </div>
            )}
            <Button size="sm" className="text-xs bg-orange-600 hover:bg-orange-500 text-white border-0 font-bold" onClick={() => { setChatHistory([{ role: "assistant", content: "Olá!" }]); setActiveContext(null); setActiveTask(null); }}><Trash2 className="w-3 h-3 mr-2" /> Limpar</Button>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-900/50 custom-scrollbar">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`w-full p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap flex flex-col gap-2 ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none ml-12" : "bg-black border border-zinc-800 text-zinc-300 rounded-bl-none mr-12"}`}>
                  {msg.role === "assistant" ? (
                    <div className="flex gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 mt-1 shrink-0" />
                      <textarea className="w-full bg-transparent border-0 text-zinc-300 focus:ring-0 focus:outline-none resize-none overflow-hidden h-auto" value={msg.content} onChange={(e) => handleEditChatMessage(idx, e.target.value)} ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }} rows={Math.max(1, msg.content.split("\n").length)} />
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-black border-t border-zinc-800">
            <div className="relative flex gap-2 items-end">
              <textarea ref={textareaRef} rows={1} className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-purple-500 focus:outline-none text-white resize-none overflow-hidden max-h-32" placeholder="Conversem sobre pautas e posts..." value={chatInput} onChange={handleInputResize} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }} disabled={isChatLoading} />
              <button onClick={() => handleChatSubmit()} disabled={isChatLoading} className="p-3 bg-purple-600 rounded-xl hover:bg-purple-500 text-white"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </section>

        {/* CALENDÁRIO MENSAL */}
        <section className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 mb-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-white"><CalendarIcon className="w-5 h-5 text-blue-500" /> Mês: {MONTHS[contentMonthIndex]}</h3>
            <div className="flex gap-2">
              <button onClick={handleSaveCalendar} className="bg-emerald-600/20 border border-emerald-500/40 px-3 py-2 rounded-lg text-xs text-emerald-300 hover:bg-emerald-600/30">Salvar Calendário</button>
              <button onClick={handleSendPlannerToApproval} className="bg-blue-600/20 border border-blue-500/40 px-3 py-2 rounded-lg text-xs text-blue-300 hover:bg-blue-600/30">Enviar para Aprovação</button>
              <button onClick={() => setContentMonthIndex((p) => (p - 1 + 12) % 12)} className="bg-black border border-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setContentMonthIndex((p) => (p + 1) % 12)} className="bg-black border border-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 grid-rows-2 gap-4">
            {["w1", "w2", "w3", "w4"].map((weekKey, idx) => {
              const startDay = WEEK_TO_DAY_MAP[weekKey];
              const weekEvents = Array.isArray(filteredEvents) ? filteredEvents.filter((e: any) => e.month === MONTHS[contentMonthIndex] && e.day >= startDay && e.day < startDay + 7) : [];
              const normalizedWeekEvents = weekEvents.map((ev: any, index: number) => {
                const currentDay = Number(ev.day);
                const suggestedDay = getSuggestedDayForWeek(startDay, index);
                const shouldSuggest = weekEvents.length > 1 && currentDay === startDay;
                const finalDay =
                  !Number.isFinite(currentDay) || currentDay <= 0 || shouldSuggest
                    ? suggestedDay
                    : currentDay;
                return { ...ev, day: finalDay, _suggested_day: suggestedDay };
              });
              return (
                <div key={weekKey} className="bg-black border border-zinc-800 rounded-xl p-4 flex flex-col h-full min-h-[250px]">
                  <div className="flex justify-between items-center mb-3 border-b border-zinc-900 pb-2">
                    <span className="text-sm font-bold text-purple-400">Semana {idx + 1}</span>
                    <span className="text-[10px] text-zinc-500">Início dia {startDay}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {normalizedWeekEvents.length > 0 ? (
                      normalizedWeekEvents.sort((a: any, b: any) => a.day - b.day).map((ev: any) => (
                        <div key={ev.id} className="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-xs flex flex-col gap-2 hover:border-zinc-600 transition group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-8 bg-black text-white font-bold text-center border border-zinc-700 rounded focus:border-blue-500 outline-none text-[10px]"
                                value={ev.day ?? ""}
                                onChange={(e) => updateEventDay(ev.id, e.target.value)}
                              />
                              <span className="text-[10px] text-zinc-500 uppercase font-bold">{getDayOfWeek(ev.day)}</span>
                            </div>
                            
                            {/* O BOTÃO QUE ABRE O MODAL PARA ENVIAR PARA OUTROS DEPARTAMENTOS */}
                            <button onClick={() => openSendModal(ev)} className="bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white p-1.5 rounded transition opacity-0 group-hover:opacity-100" title="Disparar Job para Produção/Arte"><Zap className="w-3 h-3" /></button>
                          </div>
                          <p className="text-gray-300 leading-snug pl-1">{ev.title}</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-800 text-xs italic">Livre</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* MODAL NOVO CARD */}
        {showNewEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-[520px] shadow-2xl">
              <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500" /> Novo Card</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Canal</label>
                    <input
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-xs text-white"
                      value={newEventData.platform}
                      onChange={(e) => setNewEventData({ ...newEventData, platform: e.target.value })}
                      placeholder="Instagram, TikTok..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Semana</label>
                    <select
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-xs text-white"
                      value={newEventData.weekKey}
                      onChange={(e) => setNewEventData({ ...newEventData, weekKey: e.target.value })}
                    >
                      <option value="w1">Semana 1</option>
                      <option value="w2">Semana 2</option>
                      <option value="w3">Semana 3</option>
                      <option value="w4">Semana 4</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Conteúdo</label>
                  <textarea
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-xs text-white min-h-[120px]"
                    value={newEventData.content}
                    onChange={(e) => setNewEventData({ ...newEventData, content: e.target.value })}
                    placeholder="Cole o conteúdo do card aqui..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Dia</label>
                    <input
                      type="number"
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-xs text-white"
                      value={newEventData.day}
                      onChange={(e) => setNewEventData({ ...newEventData, day: e.target.value })}
                      placeholder="Ex.: 5"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => setNewEventData({ ...newEventData, day: String(WEEK_TO_DAY_MAP[newEventData.weekKey] || "") })}
                      className="text-xs bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 w-full"
                    >
                      Usar dia da semana
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <Button variant="ghost" onClick={() => setShowNewEventModal(false)} className="text-white">Cancelar</Button>
                <Button onClick={handleCreateNewEvent} className="bg-blue-600 hover:bg-blue-500 text-white font-bold">Criar Card</Button>
              </div>
            </div>
          </div>
        )}

        <div className="h-10"></div>
      </div>

      {/* MODAL TAREFA KANBAN */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#18181b] border border-zinc-800 p-8 rounded-2xl w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white"><Plus className="w-5 h-5 text-purple-500" /> {editingTaskId ? "Editar Tarefa" : "Nova Tarefa"}</h3>
            <div className="space-y-5">
              <div><label className="text-xs text-zinc-400 mb-1 block">Título *</label><input autoFocus className="w-full bg-black border border-purple-500 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.1)]" value={newTaskData.title} onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") handleSaveTask(); }} /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Detalhes</label><textarea className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 focus:outline-none min-h-[100px] resize-none" value={newTaskData.description} onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })} /></div>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Formatos</label>
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
                <label className="text-xs text-zinc-400 mb-2 block">Responsáveis</label>
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
              <Button onClick={handleSaveTask} className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-6">{editingTaskId ? "Salvar" : "Criar Tarefa"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SEND (PIPELINE DISPATCH) */}
      {showSendModal && selectedContentForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2"><Zap className="w-5 h-5 text-purple-500" /> Disparar Job de Conteúdo</h3>
            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 mb-6">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Resumo do Conteúdo</p>
              <p className="text-sm text-zinc-300 italic">"{selectedContentForDispatch.content}"</p>
              <span className="inline-block mt-3 px-2 py-1 bg-purple-900/20 border border-purple-500/30 text-[10px] text-purple-400 rounded uppercase font-bold">{selectedContentForDispatch.platform}</span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Departamentos</label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(DEPARTAMENTOS).map(([key, dept]) => {
                    const isSelected = selectedSectors.includes(key);
                    const team = dept.equipe || [];
                    const selectedTeam = selectedPeopleBySector[key] || [];
                    return (
                      <div key={key} className="bg-black/40 border border-zinc-800 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-bold text-white">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedSectors((prev) =>
                                  checked ? [...prev, key] : prev.filter((s) => s !== key)
                                );
                                if (!checked) {
                                  setSelectedPeopleBySector((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }
                              }}
                            />
                            {dept.label}
                          </label>
                          <span className="text-[10px] text-zinc-500">
                            {isSelected ? "Selecionado" : "Opcional"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {team.map((pessoa) => {
                            const personSelected = selectedTeam.includes(pessoa);
                            return (
                              <button
                                key={pessoa}
                                type="button"
                                disabled={!isSelected}
                                onClick={() =>
                                  setSelectedPeopleBySector((prev) => {
                                    const current = prev[key] || [];
                                    const next = current.includes(pessoa)
                                      ? current.filter((p) => p !== pessoa)
                                      : [...current, pessoa];
                                    return { ...prev, [key]: next };
                                  })
                                }
                                className={`text-[10px] font-bold rounded-lg border px-2 py-2 text-left transition ${
                                  personSelected ? "bg-green-600 text-white border-green-500" : "bg-zinc-950 text-zinc-300 border-zinc-700"
                                } ${!isSelected ? "opacity-50 cursor-not-allowed" : "hover:border-green-500"}`}
                              >
                                {personSelected ? `Selecionado: ${pessoa}` : pessoa}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendToApproval}
                  onChange={(e) => setSendToApproval(e.target.checked)}
                />
                <label className="text-xs text-zinc-300">Enviar pauta para aprovação (Atendimento)</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 border-t border-zinc-800/50 pt-6">
              <Button variant="ghost" onClick={() => setShowSendModal(false)} className="text-white font-bold hover:bg-zinc-800">Cancelar</Button>
              <Button onClick={handleDispatchJob} disabled={!selectedSectors.length} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 gap-2"><Send className="w-4 h-4" /> Despachar Agora</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

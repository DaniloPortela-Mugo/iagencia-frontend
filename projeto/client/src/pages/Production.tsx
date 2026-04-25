import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";

// Icons
import { 
  Clapperboard, CalendarClock, Users, DollarSign, 
  Wand2, Save, Phone, Truck, FileText, Speaker,
  Siren, ShieldAlert, CheckCircle2, Printer,
  Layout, ChevronUp, ChevronDown, Plus, User,
  Edit3, Trash2, Video, Image as ImageIcon, Mic, Box,
  X, ArrowRight, Eye, Send, Sparkles, MessageSquare, Briefcase, Film, Clock
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// IMPORTAÇÕES VITAIS
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { KanbanBoard } from "../components/KanbanBoard";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const PRODUCTION_PLAN_URL =
  import.meta.env.VITE_PRODUCTION_PLAN_URL?.trim() || `${API_URL}/production/plan`;
const PRODUCTION_CHAT_URL =
  import.meta.env.VITE_PRODUCTION_CHAT_URL?.trim() || `${API_URL}/production/chat`;

const EQUIPE = [
  { id: "rodrigo", label: "Rodrigo", role: "Media/RTV", photoUrl: "/equipe/rodrigo.jpg" },
  { id: "kleber", label: "Kleber", role: "Admin", photoUrl: "/equipe/kleber.jpg" },
  { id: "julia", label: "Julia", role: "Plan", photoUrl: "/equipe/julia.jpg" },
];

const TASK_FORMATS = ["Vídeo Institucional", "Reels/TikTok", "Sessão de Fotos", "Evento / Ativação", "Podcast"];

const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Pré-Produção (Orçar)', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Gravação / SET', color: 'bg-red-500' },
    { id: 'review', label: 'Pós-Produção', color: 'bg-orange-500' },
    { id: 'done', label: 'Finalizado', color: 'bg-green-500' }
];

// --- DADOS MOCK (FALLBACK) ---
const MOCK_PLAN_DATA = {
    timeline: [{ date: "10/10", phase: "Pré-Produção", task: "Contratação de Equipe" }],
    staff_needs: [{ role: "Diretor", qty: 1 }, { role: "Assistente de Câmera", qty: 2 }],
    budget_lines: [{ category: "pessoal", item: "Cachê Diretor", est_cost: 5000 }, { category: "equipamento", item: "Locação Lentes", est_cost: 1500 }],
    risks: [{ severity: "medium", alert: "Risco de Chuva (Externa)", solution: "Locar Tendas / Capas de Câmera" }]
};

const CATEGORY_CONFIG: any = {
    pessoal: { label: "Pessoal & Staff", icon: Users, color: "text-blue-400", bg: "bg-blue-900/20" },
    equipamento: { label: "Equipamento & Técnica", icon: Speaker, color: "text-purple-400", bg: "bg-purple-900/20" },
    infra: { label: "Infraestrutura & Serviços", icon: Truck, color: "text-orange-400", bg: "bg-orange-900/20" },
    legal: { label: "Legal & Alvarás", icon: FileText, color: "text-red-400", bg: "bg-red-900/20" },
};

export default function Production() {
  const { activeTenant, user } = useAuth();
  const editorName = user?.name || "Sistema"; 

  // --- STATES KANBAN (SUPABASE) ---
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(false); 
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);

  // --- MODAL DE EDIÇÃO ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState<{
    title: string; description: string; formats: string[]; status: string; assignees: string[];
  }>({ title: "", description: "", formats: [], status: "todo", assignees: [] });

  // --- STATES DO PLANNER E CHAT ---
  const [activeTab, setActiveTab] = useState("timeline");
  const [showHiddenCosts, setShowHiddenCosts] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [realSuppliers, setRealSuppliers] = useState<any[]>([]);
  
  const [brief, setBrief] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai', content: string}[]>([
      { role: 'ai', content: "Olá! Sou seu assistente de produção. Carregue um Job e eu ajudo a orçar a logística e a equipe." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const draftSaveTimerRef = useRef<number | null>(null);
  const planStorageKey = useMemo(() => {
    const tenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    return tenant ? `production_plan:${tenant}` : "";
  }, [activeTenant]);

  // === FETCH DO SUPABASE ===
  const fetchTasks = async () => {
      // Puxamos a Produção (RTV + Eventos)
      let query = supabase.from('tasks').select('*').eq('department', 'producao');
      if (activeTenant && activeTenant !== "all") {
        query = query.eq('tenant', activeTenant);
      }
      const { data } = await query;
      if (data) setTasks(data);
  };

  useEffect(() => {
      fetchTasks();
      const channel = supabase.channel(`realtime:producao_tasks:${activeTenant || "all"}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: "department=eq.producao" }, 
        () => { fetchTasks(); toast.info("🎬 Novo Briefing de Produção Recebido!"); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: "department=eq.producao" },
        () => { fetchTasks(); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks', filter: "department=eq.producao" },
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
      .eq("department", "producao")
      .maybeSingle()
      .then(({ data }) => {
        const saved = data?.state as any;
        if (!saved) return;
        if (saved.chatMessages) setChatMessages(saved.chatMessages);
        if (saved.chatInput !== undefined) setChatInput(saved.chatInput);
      });
  }, [activeTenant, activeTask?.id]);

  useEffect(() => {
    if (!activeTask?.id) return;
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return;
    const stateToSave = {
      chatMessages,
      chatInput,
    };
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(async () => {
      await supabase.from("task_drafts").upsert(
        {
          tenant_slug: safeTenant,
          task_id: activeTask.id,
          department: "producao",
          state: stateToSave,
          updated_at: new Date().toISOString(),
          created_by: user?.id || null,
        },
        { onConflict: "tenant_slug,task_id,department" }
      );
    }, 800);
  }, [chatMessages, chatInput, activeTenant, activeTask?.id, user?.id]);

  // Limpa o plano quando muda a marca
  useEffect(() => {
      if (activeTask && activeTenant !== "all" && activeTask.tenant !== activeTenant) {
          setActiveTask(null);
      }
      setBrief(""); 
  }, [activeTenant]);

  useEffect(() => {
    if (!planStorageKey) {
      setPlan(null);
      return;
    }
    try {
      const raw = localStorage.getItem(planStorageKey);
      if (!raw) {
        setPlan(null);
        return;
      }
      const parsed = JSON.parse(raw);
      setPlan(parsed && typeof parsed === "object" ? parsed : null);
    } catch {
      setPlan(null);
    }
  }, [planStorageKey]);

  useEffect(() => {
    if (!planStorageKey) return;
    if (!plan) {
      localStorage.removeItem(planStorageKey);
      return;
    }
    try {
      localStorage.setItem(planStorageKey, JSON.stringify(plan));
    } catch {}
  }, [plan, planStorageKey]);

  useEffect(() => {
      const tenantToLoad = activeTenant && activeTenant !== "all" ? activeTenant : "";
      if (!tenantToLoad) {
        setRealSuppliers([]);
        return;
      }
      (async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await fetch(`${API_URL}/library/suppliers?tenant_slug=${tenantToLoad}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("Falha ao carregar fornecedores");
        const data = await res.json();
        setRealSuppliers(data);
      })().catch(() => setRealSuppliers([]));
  }, [activeTenant]);

  useEffect(() => {
      if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
  }, [chatMessages]);

  // === KANBAN HANDLERS ===
  const handleDrop = async (taskId: number, status: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      await updateTaskStatus(taskId, status, editorName);
      await fetchTasks();
  };

  const handleDeleteTask = async (id: number) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
      if (activeTask?.id === id) setActiveTask(null);
      toast.success("Produção excluída.");
  };

  const handleOpenEditTask = (task: any) => {
    setNewTaskData({ title: task.title || "", description: task.description || "", formats: task.formats || [], status: task.status || "todo", assignees: task.assignees || [] });
    setEditingTaskId(task.id); setShowTaskModal(true);
  };

  const toggleFormat = (fmt: string) => setNewTaskData(prev => ({ ...prev, formats: prev.formats.includes(fmt) ? prev.formats.filter(f => f !== fmt) : [...prev.formats, fmt] }));
  const toggleAssignee = (personId: string) => setNewTaskData(prev => ({ ...prev, assignees: prev.assignees.includes(personId) ? prev.assignees.filter(id => id !== personId) : [...prev.assignees, personId] }));

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!safeTenant) return toast.error("Selecione um cliente antes de criar uma produção.");
    const payload = {
      tenant: safeTenant,
      department: 'producao',
      updated_by: editorName,
      title: newTaskData.title, 
      description: newTaskData.description, 
      formats: newTaskData.formats,
      status: newTaskData.status || "todo", 
      assignees: newTaskData.assignees, 
      due_date: "Semana que vem"
    };

    if (editingTaskId) {
        await supabase.from('tasks').update(payload).eq('id', editingTaskId);
        toast.success("Produção atualizada!");
    } else {
        await supabase.from('tasks').insert([payload]);
        toast.success("Nova produção agendada!");
    }
    fetchTasks(); setShowTaskModal(false); setEditingTaskId(null);
  };

  const selectTask = (task: any) => {
      setActiveTask(task);
      setBrief(`Referência: ${task.title}\nDetalhes: ${task.description || "Sem detalhes"}\nFormatos: ${task.formats?.join(", ") || ""}`);
      toast.info(`Produção selecionada: ${task.title}`);
  };

  // === PLANNER HANDLERS ===
  const formatDateInput = (value: string) => {
    const digits = (value || "").replace(/\D/g, "").slice(0, 8);
    const parts = [];
    if (digits.length >= 2) parts.push(digits.slice(0, 2));
    else parts.push(digits);
    if (digits.length >= 4) parts.push(digits.slice(2, 4));
    else if (digits.length > 2) parts.push(digits.slice(2));
    if (digits.length > 4) parts.push(digits.slice(4));
    return parts.filter(Boolean).join("/");
  };

  const normalizeDate = (value: string) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";
    // aceita YYYY-MM-DD direto
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // aceita DD/MM/AAAA
    const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      return `${yyyy}-${mm}-${dd}`;
    }
    return trimmed;
  };

  const handleGeneratePlan = async () => {
    if (!brief) { toast.warning("Preencha o briefing do Job."); return; }
    const tenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    if (!tenant) { toast.error("Selecione um cliente."); return; }
    setIsProcessing(true);
    try {
      const effectiveDate = normalizeDate(eventDate) || new Date().toISOString().slice(0, 10);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(PRODUCTION_PLAN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          tenant_slug: tenant,
          title: "Plano de Producao",
          raw_input: brief,
          objective: brief,
          brief,
          date: effectiveDate,
        }),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const errJson = await res.json();
          detail = errJson?.error || errJson?.message || "";
        } catch {}
        throw new Error(detail || `Erro no servidor (${res.status})`);
      }
      const data = await res.json();
      console.log("[production/plan] raw response:", data);
      if (data?.error) {
        throw new Error(String(data.error));
      }

      const parsed =
        typeof data === "string"
          ? (() => {
              try {
                return JSON.parse(data);
              } catch {
                return data;
              }
            })()
          : data;
      const payload =
        parsed && typeof parsed === "object" && "data" in parsed && parsed.data
          ? parsed.data
          : parsed;
      console.log("[production/plan] payload:", payload);

      const normalizedTimeline = Array.isArray(payload?.timeline)
        ? payload.timeline.map((t: any) => ({
            ...t,
            date: toDayMonth(String(t?.date || "")),
            phase: translateLabel(String(t?.phase || "")),
          }))
        : payload?.timeline && typeof payload.timeline === "object"
        ? (() => {
            if (Array.isArray((payload.timeline as any).milestones)) {
              return (payload.timeline.milestones || []).map((m: any) => ({
                date: toDayMonth(`${m.start_date || ""} → ${m.end_date || ""}`.trim()),
                phase: m.name || "Etapa",
                task: "",
              }));
            }
            const t = payload.timeline as any;
            const phaseLabel: Record<string, string> = {
              pre_production: "Pré-produção",
              production: "Produção",
              post_production: "Pós-produção",
              release: "Lançamento",
            };
            if (
              t.pre_production ||
              t.production ||
              t.post_production
            ) {
              return Object.entries(t).flatMap(([key, value]: any) => {
                if (!value || typeof value !== "object") return [];
                const start = value.start_date || value.start || value.from || value.begin || value.inicio;
                const end = value.end_date || value.end || value.to || value.fim;
                if (!start && !end) return [];
                const label = phaseLabel[key] || String(key).replace(/_/g, " ");
                return [{
                  date: toDayMonth(end && end !== start ? `${start} → ${end}` : `${start || end}`),
                  phase: label,
                  task: "",
                }];
              });
            }
            const pairs = [
              ["Pré-produção", t.pre_production_start || t.preProductionStart, t.pre_production_end || t.preProductionEnd],
              ["Produção", t.production_start || t.productionStart, t.production_end || t.productionEnd],
              ["Pós-produção", t.post_production_start || t.postProductionStart, t.post_production_end || t.postProductionEnd],
              ["Lançamento", t.release_date || t.releaseDate, t.release_date || t.releaseDate],
            ];
            return pairs
              .filter(([, start]) => Boolean(start))
              .map(([label, start, end]) => ({
                date: toDayMonth(end && end !== start ? `${start} → ${end}` : `${start}`),
                phase: label as string,
                task: "",
              }));
          })()
        : [];

      const normalizedStaff = Array.isArray(payload?.staff_needs)
        ? payload.staff_needs.map((s: any) => ({
            ...s,
            role: translateLabel(String(s?.role || "")),
          }))
        : payload?.staff_needs && typeof payload.staff_needs === "object"
        ? (() => {
            const entries = Object.entries(payload.staff_needs);
            const isFlat = entries.every(([, v]) => typeof v === "number");
            if (isFlat) {
              return entries.map(([role, qty]) => ({
                role: translateLabel(String(role)),
                qty: Number(qty) || 0,
              }));
            }
            return entries.flatMap(([phase, roles]: any) =>
              Object.entries(roles || {}).map(([role, qty]) => ({
                role: `${translateLabel(String(role))} (${translateLabel(String(phase))})`,
                qty: Number(qty) || 0,
              }))
            );
          })()
        : [];

      const normalizedBudget = Array.isArray(payload?.budget_lines)
        ? payload.budget_lines.map((b: any) => ({
            ...b,
            category: translateLabel(String(b?.category || "")),
            item: translateLabel(String(b?.item || "")),
          }))
        : payload?.budget_lines && typeof payload.budget_lines === "object"
        ? Object.entries(payload.budget_lines).flatMap(([category, value]: any) => {
            if (value && typeof value === "object") {
              return Object.entries(value).map(([item, cost]) => ({
                category: translateLabel(String(category)),
                item: translateLabel(String(item)),
                est_cost: Number(cost) || 0,
              }));
            }
            return [{
              category: translateLabel(String(category)),
              item: "Estimativa",
              est_cost: Number(value) || 0,
            }];
          })
        : [];

      const riskKeyMap: Record<string, { title: string; description?: string }> = {
        schedule_delays: {
          title: "Atrasos no cronograma",
          description: "Possíveis atrasos por clima, logística ou imprevistos de produção.",
        },
        budget_overrun: {
          title: "Estouro de orçamento",
          description: "Risco de custos acima do previsto por despesas imprevistas.",
        },
        talent_availability: {
          title: "Disponibilidade de talentos",
          description: "Possíveis conflitos de agenda com elenco ou equipe-chave.",
        },
        technical_issues: {
          title: "Problemas técnicos",
          description: "Falhas em equipamentos ou ferramentas de pós-produção.",
        },
        atrasos: { title: "Atrasos no cronograma" },
        orcamento: { title: "Estouro de orçamento" },
        tecnologia: { title: "Problemas técnicos" },
      };
      const normalizedRisks = Array.isArray(payload?.risks)
        ? payload.risks.map((r: any) => ({
            ...r,
            alert: translateRiskText(String(r?.alert || "")),
            solution: translateRiskText(String(r?.solution || "")),
          }))
        : payload?.risks && typeof payload.risks === "object"
        ? Object.entries(payload.risks).map(([key, risk]: any) => {
            const keySlug = String(key).toLowerCase().replace(/\s+/g, "_");
            const mapped = riskKeyMap[keySlug];
            const title = mapped?.title || String(key).replace(/_/g, " ");
            const desc =
              typeof risk === "string"
                ? mapped?.description || risk
                : risk?.descrição || risk?.descricao || mapped?.description || "";
            const solution = risk?.mitigação || risk?.mitigacao || "";
            return {
              severity: "medium",
              alert: translateRiskText(`${title}: ${desc}`.trim()),
              solution: translateRiskText(solution),
            };
          })
        : [];

      const normalized = {
        timeline: normalizedTimeline,
        staff_needs: normalizedStaff,
        budget_lines: normalizedBudget,
        risks: normalizedRisks,
      };
      console.log("[production/plan] normalized lengths:", {
        timeline: normalized.timeline.length,
        staff_needs: normalized.staff_needs.length,
        budget_lines: normalized.budget_lines.length,
        risks: normalized.risks.length,
      });
      if (
        normalized.timeline.length === 0 &&
        normalized.staff_needs.length === 0 &&
        normalized.budget_lines.length === 0 &&
        normalized.risks.length === 0
      ) {
        throw new Error("Resposta inválida da IA.");
      }
      setPlan(normalized);
      toast.success("Plano Técnico Gerado!");
    } catch (error) { 
        const msg = error instanceof Error ? error.message : "Falha ao gerar orçamento.";
        const lower = msg.toLowerCase();
        const isQuota =
          lower.includes("insufficient_quota") ||
          lower.includes("quota") ||
          lower.includes("billing") ||
          lower.includes("credit");
        if (isQuota) {
          toast.error("Sem créditos na API de Produção. Verifique o saldo da chave.");
        } else {
          toast.error(`Não foi possível gerar o orçamento real. ${msg}`);
        }
        const useTemplate = confirm("Falha ao gerar via IA. Deseja usar o template de orçamento padrão?");
        if (useTemplate) {
          setPlan(MOCK_PLAN_DATA);
          toast.info("Template padrão aplicado.");
        }
    } finally { setIsProcessing(false); }
  };

  const handleSendChat = async () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput; setChatInput("");
      setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]); setIsChatLoading(true);
      try {
          const tenant = activeTenant === 'all' ? '' : activeTenant;
          if (!tenant) throw new Error("Selecione um cliente.");
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          const res = await fetch(PRODUCTION_CHAT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                tenant_slug: tenant,
                message: userMsg,
                brief_context: brief || "Sem briefing.",
                suppliers: realSuppliers,
              })
          });
          const data = await res.json();
          setChatMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      } catch (e) {
          setChatMessages(prev => [...prev, { role: 'ai', content: "Erro ao conectar com o assistente." }]);
      } finally { setIsChatLoading(false); }
  };

  const updateTimelineItem = (i:number, f:string, v:string) => { 
    const base = Array.isArray(plan?.timeline) ? plan.timeline : [];
    const n = [...base]; n[i] = {...n[i], [f]:v}; setPlan({...plan, timeline:n}); 
  };
  const addTimelineItem = () => {
    const base = Array.isArray(plan?.timeline) ? plan.timeline : [];
    setPlan({...plan, timeline:[...base, {date:"D-??", phase:"Nova", task:""}]});
  };
  const removeTimelineItem = (i:number) => {
    const base = Array.isArray(plan?.timeline) ? plan.timeline : [];
    setPlan({...plan, timeline:base.filter((_:any, idx:number)=>idx!==i)});
  };
  const updateBudgetLine = (i:number, f:string, v:any) => { 
    const base = Array.isArray(plan?.budget_lines) ? plan.budget_lines : [];
    const n = [...base]; n[i] = {...n[i], [f]:f==='est_cost'?Number(v):v}; setPlan({...plan, budget_lines:n}); 
  };
  const addBudgetLine = (c:string) => {
    const base = Array.isArray(plan?.budget_lines) ? plan.budget_lines : [];
    setPlan({...plan, budget_lines:[...base, {category:c, item:"Novo", est_cost:0}]});
  };
  const removeBudgetLine = (i:number) => {
    const base = Array.isArray(plan?.budget_lines) ? plan.budget_lines : [];
    setPlan({...plan, budget_lines:base.filter((_:any, idx:number)=>idx!==i)});
  };

  const updateStaffSupplier = (i:number, supplierId: string) => {
    const base = Array.isArray(plan?.staff_needs) ? plan.staff_needs : [];
    const n = [...base];
    n[i] = { ...n[i], supplier_id: supplierId === "none" ? null : supplierId };
    setPlan({ ...plan, staff_needs: n });
  };

  const toDayMonth = (value: string) => {
    if (!value) return value;
    const parts = value.split("→").map(v => v.trim());
    const fmt = (v: string) => {
      const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return `${iso[3]}/${iso[2]}`;
      const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (br) return `${br[1]}/${br[2]}`;
      return v;
    };
    return parts.map(fmt).join(" → ");
  };

  const translateRiskText = (text: string) => {
    if (!text) return text;
    const map: Array<[RegExp, string]> = [
      [/schedule delays?/gi, "Atrasos no cronograma"],
      [/budget overruns?/gi, "Estouro de orçamento"],
      [/talent availability/gi, "Disponibilidade de talentos"],
      [/technical issues?/gi, "Problemas técnicos"],
      [/mitigation/gi, "Mitigação"],
      [/risk/gi, "Risco"],
    ];
    return map.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
  };

  const translateLabel = (value: string) => {
    if (!value) return value;
    const dict: Record<string, string> = {
      director: "Diretor",
      producer: "Produtor",
      camera_operators: "Operadores de Câmera",
      audio_technicians: "Técnicos de Áudio",
      lighting_technicians: "Técnicos de Iluminação",
      assistant_director: "Assistente de Direção",
      production_assistant: "Assistente de Produção",
      cast: "Elenco",
      crew: "Equipe",
      editor: "Editor",
      sound_designer: "Designer de Som",
      colorist: "Colorista",
      location_rentals: "Locação de Espaços",
      equipment_rentals: "Locação de Equipamentos",
      staff_salaries: "Salários da Equipe",
      travel_expenses: "Despesas de Viagem",
      permits_and_licenses: "Licenças e Alvarás",
      cast_fee: "Cachê de Elenco",
      crew_fee: "Cachê de Equipe",
      catering: "Alimentação",
      insurance: "Seguro",
      accommodation: "Hospedagem",
      transportation: "Transporte",
      pre_production: "Pré-produção",
      production: "Produção",
      post_production: "Pós-produção",
    };
    const slug = value.toLowerCase().replace(/\s+/g, "_");
    if (dict[slug]) return dict[slug];
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col h-screen overflow-hidden">
      
      <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 shrink-0 bg-black z-20 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-900/30 rounded-lg"><Clapperboard className="w-6 h-6 text-orange-500" /></div>
          <div><h1 className="text-lg font-bold">Produção (RTV & Eventos)</h1></div>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 hover:text-white transition">
                <Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher Pauta" : "Ver Pauta"}
                {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
        </div>
      </header>

      {/* COMPONENTE KANBAN UNIVERSAL */}
      <KanbanBoard 
            isExpanded={isKanbanExpanded}
            onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
            tasks={filteredTasks}
            activeTask={activeTask}
            onTaskSelect={selectTask} // Ao clicar, preenche o assistente de orçamento
            onTaskDelete={handleDeleteTask}
            onTaskDrop={handleDrop}
            onTaskEdit={handleOpenEditTask}
            onNewTaskClick={(status) => { 
                setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] });
                setEditingTaskId(null); setShowTaskModal(true); 
            }}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        
            <div className="flex flex-col lg:flex-row gap-6 h-full pb-10">
            {/* COLUNA ESQUERDA: BRIEFING + CHAT */}
            <div className="w-full lg:w-1/3 space-y-4 print:hidden h-fit flex flex-col relative z-10">
                <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Wand2 className="w-4 h-4 text-orange-500" /> Diretor de Produção IA</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block flex justify-between items-center">
                                Necessidades do Job
                                {activeTask && <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">Lincado ao Kanban</span>}
                            </label>
                            <Textarea 
                                placeholder="Selecione um Job no Kanban ou descreva a ideia..." 
                                className="bg-black border-zinc-700 min-h-[100px] text-zinc-200 text-xs focus:border-orange-500" 
                                value={brief} 
                                onChange={(e) => setBrief(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Data Alvo de Produção</label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="dd/mm/aaaa"
                              className="bg-black border-zinc-700 text-white text-xs pointer-events-auto"
                              value={eventDate}
                              onChange={(e) => setEventDate(formatDateInput(e.target.value))}
                            />
                        </div>
                        <Button onClick={handleGeneratePlan} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 font-bold text-sm shadow-lg border-0">
                            {isProcessing ? "Gerando Matriz..." : "Gerar Plano de Produção"}
                        </Button>
                    </CardContent>
                </Card>

                {/* CHAT / BUSCA */}
                <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex-1 flex flex-col min-h-[300px]">
                    <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 rounded-t-xl flex items-center justify-between">
                         <h3 className="text-xs font-bold text-blue-400 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Assistente de Compras</h3>
                         <Badge variant="outline" className="text-[9px] border-blue-900 text-blue-500 bg-blue-950/30">IA Conectada</Badge>
                    </div>
                    <div ref={chatScrollRef} className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-zinc-800">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-300 rounded-bl-none border border-zinc-700'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start"><div className="bg-zinc-800 rounded-lg p-2 flex gap-1 items-center"><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-75"></span><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150"></span></div></div>
                        )}
                    </div>
                    <div className="p-2 border-t border-zinc-800 bg-zinc-900/30 flex gap-2">
                        <Input className="bg-black border-zinc-700 h-9 text-xs focus-visible:ring-blue-500" placeholder="Ex: Quanto custa a diária de luz?" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} />
                        <Button size="icon" onClick={handleSendChat} disabled={isChatLoading} className="h-9 w-9 bg-blue-600 hover:bg-blue-500"><Send className="w-4 h-4" /></Button>
                    </div>
                </Card>
            </div>

            {/* COLUNA DIREITA: RESULTADO DO PLANO */}
            <div className="flex-1 w-full min-h-[500px] relative z-0">
            {!plan ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 p-10 text-zinc-500 pointer-events-none">
                    <Clapperboard className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium text-center">Use o Assistente à esquerda para discutir o job<br/>ou clique em Gerar Plano.</p>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col gap-6">
                    <TabsList className="grid grid-cols-4 gap-4 bg-transparent h-auto p-0 print:hidden">
                        {[
                            { id: 'timeline', label: 'Cronograma', icon: CalendarClock, color: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-900/20' },
                            { id: 'staff', label: 'Equipe', icon: Users, color: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-900/20' },
                            { id: 'budget', label: 'Orçamento', icon: DollarSign, color: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-900/20' },
                            { id: 'risks', label: 'Riscos', icon: ShieldAlert, color: 'text-red-400', border: 'border-red-500/50', bg: 'bg-red-900/20' }
                        ].map((btn) => {
                            const isActive = activeTab === btn.id;
                            const Icon = btn.icon;
                            return (
                                <TabsTrigger key={btn.id} value={btn.id} className={`relative p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 h-24 data-[state=active]:${btn.bg} data-[state=active]:${btn.border} data-[state=active]:shadow-[0_0_20px_rgba(0,0,0,0.3)] data-[state=active]:scale-105 bg-zinc-900 border-zinc-800 opacity-60 hover:opacity-100 data-[state=active]:opacity-100`}>
                                    <Icon className={`w-6 h-6 ${isActive ? btn.color : 'text-zinc-400'}`} />
                                    <span className={`text-xs font-bold uppercase ${isActive ? 'text-white' : 'text-zinc-500'}`}>{btn.label}</span>
                                </TabsTrigger>
                            )
                        })}
                    </TabsList>

                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex-1 min-h-[400px] print:border-0 print:bg-white print:p-0 relative">
                         <TabsContent value="timeline" className="space-y-3 mt-0">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><CalendarClock className="w-5 h-5 text-blue-500"/> Cronograma</h3>
                                <Button size="sm" variant="ghost" onClick={addTimelineItem} className="text-blue-400 text-xs gap-1 border border-blue-900/30"><Plus className="w-3 h-3"/> Add</Button>
                             </div>
                             {(Array.isArray(plan?.timeline) ? plan.timeline : []).map((item:any, idx:number) => (
                                <div key={idx} className="flex gap-3 items-center bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg">
                                    <Input className="w-16 bg-black border-zinc-700 text-center text-xs" value={toDayMonth(item.date)} onChange={(e)=>updateTimelineItem(idx,'date',e.target.value)} />
                                    <div className="flex-1 space-y-1">
                                        <Input className="bg-transparent border-none text-[10px] text-blue-300 uppercase font-bold h-auto p-0" value={item.phase} onChange={(e)=>updateTimelineItem(idx,'phase',e.target.value)} />
                                        <Input className="bg-transparent border-none text-sm text-zinc-200" value={item.task} onChange={(e)=>updateTimelineItem(idx,'task',e.target.value)} />
                                    </div>
                                    <button onClick={()=>removeTimelineItem(idx)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                             ))}
                         </TabsContent>

                         <TabsContent value="staff">
                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500"/> Equipe / Staff</h3>
                             <div className="grid grid-cols-2 gap-4">
                                {(Array.isArray(plan?.staff_needs) ? plan.staff_needs : []).map((staff:any, idx:number) => (
                                    <Card key={idx} className="bg-zinc-900 border-zinc-800">
                                        <CardHeader className="pb-2 p-4 flex flex-row justify-between"><span className="text-sm font-bold text-white">{staff.role}</span><Badge className="bg-purple-900/50">{staff.qty}x</Badge></CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <Select value={staff.supplier_id ? String(staff.supplier_id) : ""} onValueChange={(v)=>updateStaffSupplier(idx, v)}>
                                                <SelectTrigger className="bg-black border-zinc-700 h-8 text-xs mt-2 text-white"><SelectValue placeholder="Alocar Fornecedor..." /></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                    {realSuppliers.length > 0 ? realSuppliers.map(s=><SelectItem key={s.id} value={String(s.id)}>{s.name} - {s.specialty}</SelectItem>) : <SelectItem value="none" disabled>Nenhum Cadastrado</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </CardContent>
                                    </Card>
                                ))}
                             </div>
                         </TabsContent>

                         <TabsContent value="budget" className="h-full flex flex-col">
                             <div className="flex justify-between mb-4">
                                 <h3 className="text-lg font-bold text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500"/> Orçamento Base</h3>
                                 <Button size="sm" variant="ghost" onClick={()=>setShowHiddenCosts(!showHiddenCosts)} className="text-xs border border-zinc-700">{showHiddenCosts?"Ocultar":"Ver"} Taxas da Agência</Button>
                             </div>
                             <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4">
                                {(() => {
                                  const base = Array.isArray(plan?.budget_lines) ? plan.budget_lines : [];
                                  const staff = Array.isArray(plan?.staff_needs) ? plan.staff_needs : [];
                                  const supplierLines = staff.flatMap((st: any) => {
                                    if (!st?.supplier_id) return [];
                                    const s = realSuppliers.find((x) => String(x.id) === String(st.supplier_id));
                                    if (!s) return [];
                                    return [{
                                      category: s.category || "fornecedores",
                                      item: `${s.name} (${s.specialty || "Fornecedor"})`,
                                      est_cost: Number(s.cost_base || 0),
                                      _supplier: true,
                                    }];
                                  });
                                  const allLines = [...base, ...supplierLines].map((it:any,ix:number)=>({...it, oIdx:ix}));
                                  const categories = Array.from(new Set(allLines.map((it:any)=>it.category)));
                                  const getConf = (cat: string) => {
                                    if (CATEGORY_CONFIG[cat]) return CATEGORY_CONFIG[cat];
                                    const label = translateLabel(String(cat));
                                    return { label: label.charAt(0).toUpperCase()+label.slice(1), icon: DollarSign, color: "text-zinc-300", bg: "bg-zinc-900/40" };
                                  };
                                  return categories.map((catKey) => {
                                    const conf = getConf(catKey);
                                    const items = allLines.filter((it:any)=>it.category===catKey);
                                    return (
                                        <div key={catKey} className="border border-zinc-800 rounded-lg">
                                            <div className={`flex justify-between px-4 py-2 ${conf.bg}`}><h3 className={`text-xs font-bold ${conf.color}`}>{conf.label}</h3><button onClick={()=>addBudgetLine(catKey)} className="text-[10px] text-white"><Plus className="w-3 h-3"/></button></div>
                                            <div className="bg-zinc-900 p-2 space-y-1">
                                                {items.map((line:any)=>(
                                                    <div key={line.oIdx} className="flex gap-2 items-center">
                                                        <Input className="flex-1 bg-transparent border-none text-xs text-zinc-300" value={line.item} onChange={(e)=>!line._supplier && updateBudgetLine(line.oIdx,'item',e.target.value)} />
                                                        <div className="w-24 relative"><span className="absolute left-2 top-2.5 text-[10px] text-zinc-500">R$</span><Input type="number" className="bg-transparent border border-zinc-800 text-right text-xs pl-6" value={line.est_cost} onChange={(e)=>!line._supplier && updateBudgetLine(line.oIdx,'est_cost',e.target.value)} /></div>
                                                        {!line._supplier && <button onClick={()=>removeBudgetLine(line.oIdx)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                  });
                                })()}
                             </div>
                             
                             {/* TOTALIZADOR */}
                             <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 mt-auto">
                                 <div className="flex justify-between text-xs text-zinc-400"><span>Subtotal (Fornecedores):</span><span className="font-mono">{(() => {
                                   const base = Array.isArray(plan?.budget_lines) ? plan.budget_lines : [];
                                   const staff = Array.isArray(plan?.staff_needs) ? plan.staff_needs : [];
                                   const supplierLines = staff.flatMap((st: any) => {
                                     if (!st?.supplier_id) return [];
                                     const s = realSuppliers.find((x) => String(x.id) === String(st.supplier_id));
                                     if (!s) return [];
                                     return [{ est_cost: Number(s.cost_base || 0) }];
                                   });
                                   const total = [...base, ...supplierLines].reduce((acc:number,c:any)=>acc+Number(c.est_cost||0),0);
                                   return total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
                                 })()}</span></div>
                                 {showHiddenCosts && <div className="flex justify-between text-xs text-indigo-300 mt-1"><span>FEE / Impostos da Agência:</span><div className="flex gap-1 items-center"><Input type="number" value={taxRate} onChange={(e)=>setTaxRate(Number(e.target.value))} className="h-5 w-10 text-[10px] bg-black border-none text-right"/><span className="text-[10px]">%</span></div></div>}
                                 <div className="h-px bg-zinc-800 my-2"></div>
                                 <div className="flex justify-between items-end"><span className="text-[10px] font-bold text-zinc-500">VALOR DO PROJETO</span><span className="text-2xl font-bold text-white">{(() => {
                                   const base = Array.isArray(plan?.budget_lines) ? plan.budget_lines : [];
                                   const staff = Array.isArray(plan?.staff_needs) ? plan.staff_needs : [];
                                   const supplierLines = staff.flatMap((st: any) => {
                                     if (!st?.supplier_id) return [];
                                     const s = realSuppliers.find((x) => String(x.id) === String(st.supplier_id));
                                     if (!s) return [];
                                     return [{ est_cost: Number(s.cost_base || 0) }];
                                   });
                                   const total = [...base, ...supplierLines].reduce((acc:number,c:any)=>acc+Number(c.est_cost||0),0);
                                   return (total*(1+taxRate/100)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
                                 })()}</span></div>
                             </div>
                         </TabsContent>

                         <TabsContent value="risks">
                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500"/> Matriz de Riscos</h3>
                             {(Array.isArray(plan?.risks) ? plan.risks : []).map((risk:any, idx:number)=>(
                                 <div key={idx} className={`border-l-4 p-4 rounded-r-lg bg-zinc-900 border-zinc-800 mb-2 ${risk.severity==='high'?'border-l-red-600':'border-l-yellow-500'}`}>
                                     <h4 className="font-bold text-sm text-white">{risk.alert}</h4>
                                     <p className="text-xs text-zinc-400 mt-1">Plano B: {risk.solution}</p>
                                 </div>
                             ))}
                         </TabsContent>
                    </div>
                </Tabs>
            )}
            </div>
        </div>
      </div>

      {/* MODAL TAREFA (CRIAR/EDITAR) */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#18181b] border border-zinc-800 p-8 rounded-2xl w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white"><Plus className="w-5 h-5 text-orange-500" /> {editingTaskId ? "Editar Produção" : "Nova Produção"}</h3>
            <div className="space-y-5">
              <div><label className="text-xs text-zinc-400 mb-1 block">Título *</label><input autoFocus className="w-full bg-black border border-orange-500 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.1)]" value={newTaskData.title} onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") handleSaveTask(); }} /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Detalhes da Produção</label><textarea className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white text-sm focus:border-orange-500 focus:outline-none min-h-[100px] resize-none" value={newTaskData.description} onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })} /></div>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Formatos</label>
                <div className="flex flex-wrap gap-2">
                  {TASK_FORMATS.map((f) => (
                    <button key={f} onClick={() => toggleFormat(f)} className={`text-xs border px-3 py-1.5 rounded-md transition ${newTaskData.formats.includes(f) ? "bg-zinc-800 border-zinc-600 text-white" : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Fase Atual</label>
                <div className="flex gap-2">
                  {KANBAN_COLUMNS.map((col) => (
                    <button key={col.id} onClick={() => setNewTaskData({ ...newTaskData, status: col.id })} className={`text-xs border px-4 py-2 rounded-md transition font-medium ${newTaskData.status === col.id ? "bg-orange-600 border-orange-500 text-white" : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}>{col.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Produtores</label>
                <div className="grid grid-cols-5 gap-2">
                  {EQUIPE.map((p) => {
                    const isSelected = newTaskData.assignees?.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => toggleAssignee(p.id)} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition ${isSelected ? "bg-zinc-800 border-zinc-600" : "bg-black border-zinc-900 hover:border-zinc-800"}`}>
                        <img src={p.photoUrl} alt={p.label} className={`w-8 h-8 rounded-full object-cover ${isSelected ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-black" : "opacity-50"}`} onError={(e) => { (e.target as any).style.display = "none"; }} />
                        <span className={`text-[9px] ${isSelected ? "text-white font-bold" : "text-zinc-600"}`}>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-zinc-800/50">
              <Button variant="ghost" className="text-white font-bold hover:bg-zinc-800" onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }}>Cancelar</Button>
              <Button onClick={handleSaveTask} className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-6">{editingTaskId ? "Salvar Alterações" : "Agendar Produção"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

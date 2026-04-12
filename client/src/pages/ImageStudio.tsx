import React, { useEffect, useRef, useState, useMemo } from "react";
import {
Palette, Wand2, Users, Loader2, RotateCcw,
MapPin, Layout, ChevronUp, ChevronDown, Box, ShoppingBag,
Aperture, Briefcase, Sparkles, Edit3, Plus, Trash2, X,
MoreHorizontal, User, Save, Settings2, Eraser, Check,
LayoutDashboard, PenTool, Paintbrush, MessageSquare, CheckSquare,
Settings, LogOut, UserCircle, Monitor, Newspaper, Eye, BrainCircuit,
Image as ImageIcon, FileText, Send, CheckCircle2, Layers, FolderOpen, Download, Recycle, Package, Shirt,
Camera, Search, Clock, Dices, BookOpen, Film,
} from "lucide-react";

import { KanbanBoard } from "../components/KanbanBoard";
import { CastingForm, initialChar, type Character } from "../components/Studio/CastingForm";
import StudioEditor from "../components/StudioEditor";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { PROMPT_LIBRARY, SUPER_PRESETS } from "../lib/promptLibrary";
import localforage from "localforage";

const RAW_API_BASE = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const API_BASE =
  typeof window !== "undefined"
    ? RAW_API_BASE.replace("0.0.0.0", window.location.hostname || "127.0.0.1")
    : RAW_API_BASE;
const GENERATE_ENDPOINT = "/creation/generate-image";

const PROMPT_FORBIDDEN_RE = /[\[\]\(\):]/g;

const getAuthHeaders = async (extra?: Record<string, string>) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

function sanitizePromptText(text: string) {
  if (!text) return "";
  return text
    .replace(PROMPT_FORBIDDEN_RE, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

const EQUIPE = [
{ id: "danilo", label: "Danilo (Arte)", photoUrl: "/equipe/danilo.jpg" },
{ id: "felipe", label: "Felipe (Arte)", photoUrl: "/equipe/felipe.jpg" },
];

const TASK_FORMATS = ["Post Social Media", "Key Visual (KV)", "Banner Site", "Mockup PDV", "Story/Reels"];

const KANBAN_COLUMNS = [
{ id: "todo", label: "Briefing Recebido", color: "bg-zinc-500" },
{ id: "doing", label: "Na Pauta", color: "bg-blue-500" },
{ id: "review", label: "Aprovação Interna", color: "bg-orange-500" },
{ id: "done", label: "Arte Finalizada", color: "bg-green-500" },
];

function stripHtml(html: string) {
if (!html) return "Sem roteiro fornecido.";
const doc = new DOMParser().parseFromString(html, 'text/html');
return doc.body.textContent || "";
}

function toAbsoluteMediaUrl(url: string) {
const normalized = (url || "").trim();
if (!normalized) return "";
if (normalized.startsWith("data:")) return normalized;
if (normalized.startsWith("blob:")) return normalized;
if (/^https?:\/\//i.test(normalized)) return normalized;
if (normalized.startsWith("//")) return `https:${normalized}`;
if (normalized.startsWith(`${API_BASE}http`)) {
return normalized.slice(normalized.indexOf("http", API_BASE.length));
}
if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
return `${API_BASE}/${normalized.replace(/^\/+/, "")}`;
}

const CONSTANTS = {
FORMATOS: ["Horizontal (16:9)", "Vertical (9:16)", "Quadrado (1:1)", "Feed Instagram (4:5)", "Ultrawide (21:9)"],
ILUMINACAO: ["Cinematic", "Natural", "Neon", "Studio", "Golden Hour", "Dramática", "Volumétrica", "Cyberpunk", "Rembrandt", "Softbox", "Flash Direto"],
CAMERA: ["Arri Alexa", "RED Raptor", "Canon R5", "Sony a7S", "35mm", "85mm", "iPhone Portrait", "rolleiflex 2.8f", "Anamorphic", "Macro", "Drone", "GoPro", "Point & Shoot"],
ESTILOS: ["Fotorrealista", "Cinematográfico", "Editorial de Moda", "Product Shot", "3D Render", "Anime", "Cyberpunk", "Pintura a Óleo"],
VISOES: [
{ label: "Frontal", value: "Visão Frontal" }, { label: "Lateral", value: "Visão Lateral" },
{ label: "Traseira", value: "Visão Traseira" }, { label: "Por cima do ombro", value: "Over the Shoulder" },
],
ANGULOS: [
{ label: "Nível dos olhos", value: "Nível dos Olhos" }, { label: "Ângulo Baixo (Low)", value: "Low Angle" },
{ label: "Ângulo Alto (High)", value: "High Angle" }, { label: "Aéreo / Drone", value: "Vista Aérea" },
{ label: "Close-up", value: "Close-up" }, { label: "Plano Aberto", value: "Plano Aberto" },
],
};

export default function ImageStudio() {
  const { activeTenant, user } = useAuth();

const [isStateLoaded, setIsStateLoaded] = useState(false);
const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
const [isBriefingExpanded, setIsBriefingExpanded] = useState(true);
const [isRefsOpen, setIsRefsOpen] = useState(false);
const [isStylesOpen, setIsStylesOpen] = useState(false);

const [tasks, setTasks] = useState<any[]>([]);
const [activeTask, setActiveTask] = useState<any>(null);
const [showTaskModal, setShowTaskModal] = useState(false);
const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
const [newTaskData, setNewTaskData] = useState({ title: "", description: "", formats: [] as string[], status: "todo", assignees: [] as string[] });

const [isViewingJob, setIsViewingJob] = useState(false);

// engine fixo: NanaBanana
const [generalIdea, setGeneralIdea] = useState("");
const [finalPrompt, setFinalPrompt] = useState("");
const [negativePrompt, setNegativePrompt] = useState("texto, marca d'água, deformado, feio, mãos distorcidas, desfocado, baixa qualidade");

const [config, setConfig] = useState({ format: "Horizontal (16:9)", lighting: "", camera: "", style: "Fotorrealista", view: "", angle: "" });
const [selectedEngine, setSelectedEngine] = useState<"replicate" | "nana" | "gemini" | "stability">("replicate");
const SHOW_OTHER_ENGINES = false;

const [characters, setCharacters] = useState<Character[]>([initialChar]);

const [faceImage, setFaceImage] = useState<string | null>(null);
const [bodyImage, setBodyImage] = useState<string | null>(null);
const [productImage, setProductImage] = useState<string | null>(null);
const [clothingImage, setClothingImage] = useState<string | null>(null);
const [styleImage, setStyleImage] = useState<string | null>(null);

const hasActiveRefs = Boolean(faceImage || bodyImage || productImage || clothingImage || styleImage);

const [isThinking, setIsThinking] = useState(false);
const [isGenerating, setIsGenerating] = useState(false);
const [generatedResult, setGeneratedResult] = useState<string | null>(null);

const [isStudioOpen, setIsStudioOpen] = useState(false);
const [imageForEditing, setImageForEditing] = useState("");
const [initialDraft, setInitialDraft] = useState<any>(null);
const draftSaveTimerRef = useRef<number | null>(null);

const [showLoadConfigModal, setShowLoadConfigModal] = useState(false);
const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
const [showLoadDraftModal, setShowLoadDraftModal] = useState(false);
const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
const [savedJobs, setSavedJobs] = useState<any[]>([]);
const [showSaveJobModal, setShowSaveJobModal] = useState(false);
const [showLoadJobModal, setShowLoadJobModal] = useState(false);
const [jobNameInput, setJobNameInput] = useState("");
const [pendingJobPayload, setPendingJobPayload] = useState<any>(null);
const [pendingReopen, setPendingReopen] = useState<{ taskId: number; approvalId?: number } | null>(null);
const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);
const [configNameInput, setConfigNameInput] = useState("");
const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
const [draftNameInput, setDraftNameInput] = useState("");
const [pendingDraftPayload, setPendingDraftPayload] = useState<any>(null);
const storageErrorToastShownRef = useRef(false);
const remoteSaveTimerRef = useRef<number | null>(null);
const [showVersionModal, setShowVersionModal] = useState(false);
const [versionLabel, setVersionLabel] = useState("");
const [versions, setVersions] = useState<any[]>([]);

const getStateKey = (tenant?: string | null, taskId?: number | null) => {
  const t = tenant || "no-tenant";
  const id = taskId || "no-task";
  return `iagencia_image_studio_state_${t}_${id}`;
};

useEffect(() => {
  async function loadState() {
    try {
      const savedState: any = await localforage.getItem("iagencia_image_studio_state");
      if (savedState) {
        if (savedState.characters) setCharacters(savedState.characters);
        if (savedState.config) setConfig(savedState.config);
        if (savedState.generalIdea) setGeneralIdea(savedState.generalIdea);
        if (savedState.finalPrompt) setFinalPrompt(savedState.finalPrompt);
        if (savedState.negativePrompt) setNegativePrompt(savedState.negativePrompt);
        if (savedState.faceImage) setFaceImage(savedState.faceImage);
        if (savedState.bodyImage) setBodyImage(savedState.bodyImage);
        if (savedState.productImage) setProductImage(savedState.productImage);
        if (savedState.clothingImage) setClothingImage(savedState.clothingImage);
        if (savedState.styleImage) setStyleImage(savedState.styleImage);
      }
      const localConfigs = localStorage.getItem("iagencia_saved_configs");
      if (localConfigs) setSavedConfigs(JSON.parse(localConfigs));
      const localDrafts = localStorage.getItem("iagencia_saved_drafts");
      if (localDrafts) setSavedDrafts(JSON.parse(localDrafts));
      const localJobs = localStorage.getItem("iagencia_saved_image_jobs");
      if (localJobs) setSavedJobs(JSON.parse(localJobs));
    } catch (e) {
    } finally {
      setIsStateLoaded(true);
    }
  }
  loadState();
}, []);

useEffect(() => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (!safeTenant) {
    setGeneratedResult(null);
    setImageForEditing("");
    return;
  }
  const loadLatest = async () => {
    try {
      const { data } = await supabase
        .from("library")
        .select("url, created_at")
        .eq("tenant_slug", safeTenant)
        .eq("type", "image")
        .order("created_at", { ascending: false })
        .limit(1);
      const url = data?.[0]?.url || null;
      setGeneratedResult(url);
      setImageForEditing(url || "");
    } catch {
      setGeneratedResult(null);
      setImageForEditing("");
    }
  };
  loadLatest();
}, [activeTenant, savedJobs]);

useEffect(() => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (!safeTenant || !activeTask?.id) return;
  const key = getStateKey(safeTenant, activeTask.id);
  localforage.getItem(key).then((savedState: any) => {
    if (!savedState) return;
    if (savedState.characters) setCharacters(savedState.characters);
    if (savedState.config) setConfig(savedState.config);
    if (savedState.generalIdea) setGeneralIdea(savedState.generalIdea);
    if (savedState.finalPrompt) setFinalPrompt(savedState.finalPrompt);
    if (savedState.negativePrompt) setNegativePrompt(savedState.negativePrompt);
    if (savedState.generatedResult) setGeneratedResult(savedState.generatedResult);
    if (savedState.faceImage) setFaceImage(savedState.faceImage);
    if (savedState.bodyImage) setBodyImage(savedState.bodyImage);
    if (savedState.productImage) setProductImage(savedState.productImage);
    if (savedState.clothingImage) setClothingImage(savedState.clothingImage);
    if (savedState.styleImage) setStyleImage(savedState.styleImage);
  }).catch(() => {});
}, [activeTenant, activeTask?.id]);

const loadVersions = async () => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (!safeTenant || !activeTask?.id) return;
  const { data } = await supabase
    .from("studio_state_versions")
    .select("id,label,created_at,state")
    .eq("tenant_slug", safeTenant)
    .eq("task_id", activeTask.id)
    .eq("studio_type", "image")
    .order("created_at", { ascending: false })
    .limit(20);
  if (data) setVersions(data);
};

const handleSaveVersion = async () => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (!safeTenant || !activeTask?.id) return toast.error("Selecione um job.");
  const stateToSave = {
    characters, config, generalIdea, finalPrompt, negativePrompt,
    generatedResult, faceImage, bodyImage, productImage, clothingImage, styleImage
  };
  const { error } = await supabase.from("studio_state_versions").insert({
    tenant_slug: safeTenant,
    task_id: activeTask.id,
    studio_type: "image",
    label: versionLabel || null,
    state: stateToSave,
    created_by: user?.id || null,
  });
  if (error) return toast.error(error.message || "Erro ao salvar versão.");
  setVersionLabel("");
  await loadVersions();
  toast.success("Versão salva.");
};

const handleLoadVersion = (v: any) => {
  const s = v?.state || {};
  if (s.characters) setCharacters(s.characters);
  if (s.config) setConfig(s.config);
  if (s.generalIdea) setGeneralIdea(s.generalIdea);
  if (s.finalPrompt) setFinalPrompt(s.finalPrompt);
  if (s.negativePrompt) setNegativePrompt(s.negativePrompt);
  if (s.generatedResult) setGeneratedResult(s.generatedResult);
  if (s.faceImage) setFaceImage(s.faceImage);
  if (s.bodyImage) setBodyImage(s.bodyImage);
  if (s.productImage) setProductImage(s.productImage);
  if (s.clothingImage) setClothingImage(s.clothingImage);
  if (s.styleImage) setStyleImage(s.styleImage);
  toast.success("Versão carregada.");
};

useEffect(() => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (!safeTenant || !activeTask?.id) return;
  supabase
    .from("studio_states")
    .select("state")
    .eq("tenant_slug", safeTenant)
    .eq("task_id", activeTask.id)
    .eq("studio_type", "image")
    .maybeSingle()
    .then(({ data }) => {
      const savedState = data?.state as any;
      if (!savedState) return;
      if (savedState.characters) setCharacters(savedState.characters);
      if (savedState.config) setConfig(savedState.config);
      if (savedState.generalIdea) setGeneralIdea(savedState.generalIdea);
      if (savedState.finalPrompt) setFinalPrompt(savedState.finalPrompt);
      if (savedState.negativePrompt) setNegativePrompt(savedState.negativePrompt);
      if (savedState.generatedResult) setGeneratedResult(savedState.generatedResult);
      if (savedState.faceImage) setFaceImage(savedState.faceImage);
      if (savedState.bodyImage) setBodyImage(savedState.bodyImage);
      if (savedState.productImage) setProductImage(savedState.productImage);
      if (savedState.clothingImage) setClothingImage(savedState.clothingImage);
      if (savedState.styleImage) setStyleImage(savedState.styleImage);
    });
}, [activeTenant, activeTask?.id]);

useEffect(() => {
  if (!activeTenant || activeTenant === "all" || !activeTask?.id) return;
  supabase
    .from("task_drafts")
    .select("state")
    .eq("tenant_slug", activeTenant)
    .eq("task_id", activeTask.id)
    .eq("department", "arte")
    .maybeSingle()
    .then(({ data }) => {
      const saved = data?.state as any;
      if (!saved) return;
      if (saved.isStudioOpen !== undefined) setIsStudioOpen(saved.isStudioOpen);
      if (saved.imageForEditing) setImageForEditing(saved.imageForEditing);
      if (saved.initialDraft) setInitialDraft(saved.initialDraft);
    });
}, [activeTenant, activeTask?.id]);

useEffect(() => {
  if (!activeTenant || activeTenant === "all" || !activeTask?.id) return;
  const stateToSave = {
    isStudioOpen,
    imageForEditing,
    initialDraft,
  };
  if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
  draftSaveTimerRef.current = window.setTimeout(async () => {
    await supabase.from("task_drafts").upsert(
      {
        tenant_slug: activeTenant,
        task_id: activeTask.id,
        department: "arte",
        state: stateToSave,
        updated_at: new Date().toISOString(),
        created_by: user?.id || null,
      },
      { onConflict: "tenant_slug,task_id,department" }
    );
  }, 800);
}, [isStudioOpen, imageForEditing, initialDraft, activeTenant, activeTask?.id, user?.id]);

const handleSaveJobSnapshot = (payload: any, name: string) => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  const sanitizedPayload = { ...payload };
  if (typeof sanitizedPayload.generatedResult === "string" && sanitizedPayload.generatedResult.startsWith("data:")) {
    sanitizedPayload.generatedResult = null;
  }
  const job = {
    id: Date.now(),
    name,
    date: new Date().toLocaleDateString("pt-BR"),
    taskId: activeTask?.id || null,
    tenant: safeTenant || "",
    payload: sanitizedPayload,
  };
  const updated = [job, ...savedJobs].slice(0, 10);
  setSavedJobs(updated);
  try {
    localStorage.setItem("iagencia_saved_image_jobs", JSON.stringify(updated));
  } catch (err) {
    toast.error("Armazenamento local cheio. O job foi salvo apenas nesta sessão.");
  }
};

const handleLoadJobSnapshot = (job: any) => {
  const p = job?.payload || {};
  if (p.characters) setCharacters(p.characters);
  if (p.config) setConfig(p.config);
  setGeneralIdea(p.generalIdea || "");
  setFinalPrompt(p.finalPrompt || "");
  setNegativePrompt(p.negativePrompt || "");
  setFaceImage(p.faceImage || null);
  setBodyImage(p.bodyImage || null);
  setProductImage(p.productImage || null);
  setClothingImage(p.clothingImage || null);
  setStyleImage(p.styleImage || null);
  setGeneratedResult(p.generatedResult || null);

  if (p.draft) {
    setInitialDraft(p.draft);
    setImageForEditing(p.generatedResult || "");
    setIsStudioOpen(true);
  }
  setShowLoadJobModal(false);
  toast.success(`Job "${job.name}" carregado!`);
};

useEffect(() => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const reopen = params.get("reopen");
  const taskId = Number(params.get("task_id") || "");
  const approvalId = Number(params.get("approval_id") || "");
  if (reopen && Number.isFinite(taskId) && taskId > 0) {
    setPendingReopen({ taskId, approvalId: Number.isFinite(approvalId) && approvalId > 0 ? approvalId : undefined });
  }
}, []);

useEffect(() => {
  if (!pendingReopen?.taskId || tasks.length === 0) return;

  const task = tasks.find(t => t.id === pendingReopen.taskId);
  if (task) setActiveTask(task);

  const loadDraft = async () => {
    try {
      const { data: drafts } = await supabase
        .from("art_drafts")
        .select("*")
        .eq("task_id", pendingReopen.taskId)
        .order("updated_at", { ascending: false })
        .limit(1);

      let draftApplied = false;
      if (drafts && drafts.length > 0) {
        const d = drafts[0];
        let elements = d.elements || [];
        if (typeof elements === "string") {
          try {
            elements = JSON.parse(elements);
          } catch {
            elements = [];
          }
        }
        setInitialDraft({
          elements: Array.isArray(elements) ? elements : [],
          bgColor: d.bg_color || "#ffffff",
          canvasFormatId: d.canvas_format_id || null,
        });
        draftApplied = true;
      }

      let approvalUrl = "";
      let approvalDraft: any = null;
      if (pendingReopen.approvalId) {
        const { data: approvals } = await supabase
          .from("approvals")
          .select("image_url,draft_payload")
          .eq("id", pendingReopen.approvalId)
          .limit(1);
        approvalUrl = approvals?.[0]?.image_url || "";
        approvalDraft = approvals?.[0]?.draft_payload || null;
      } else {
        const { data: approvals } = await supabase
          .from("approvals")
          .select("image_url,draft_payload")
          .eq("task_id", pendingReopen.taskId)
          .order("created_at", { ascending: false })
          .limit(1);
        approvalUrl = approvals?.[0]?.image_url || "";
        approvalDraft = approvals?.[0]?.draft_payload || null;
      }

      if (!draftApplied && approvalDraft) {
        const elements = Array.isArray(approvalDraft?.elements)
          ? approvalDraft.elements
          : [];
        setInitialDraft({
          elements,
          bgColor: approvalDraft?.bgColor || "#ffffff",
          canvasFormatId: approvalDraft?.canvasFormatId || null,
        });
      }

      const finalApprovalUrl = toAbsoluteMediaUrl(approvalUrl || "");
      if (finalApprovalUrl) {
        setGeneratedResult(finalApprovalUrl);
      }
      setImageForEditing(toAbsoluteMediaUrl(approvalUrl || generatedResult || ""));
      setIsStudioOpen(true);
    } catch {
      setImageForEditing(generatedResult || "");
      setIsStudioOpen(true);
    } finally {
      setPendingReopen(null);
    }
  };

  loadDraft();
}, [pendingReopen, tasks, generatedResult]);

useEffect(() => {
  if (!isStateLoaded) return;
  const stateToSave = {
    characters, config, generalIdea, finalPrompt, negativePrompt,
    generatedResult, faceImage, bodyImage, productImage, clothingImage, styleImage
  };
  localforage.setItem("iagencia_image_studio_state", stateToSave).catch(() => {
    if (!storageErrorToastShownRef.current) {
      storageErrorToastShownRef.current = true;
      toast.error("Não foi possível persistir o estado local do estúdio.");
    }
  });
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (safeTenant && activeTask?.id) {
    const key = getStateKey(safeTenant, activeTask.id);
    localforage.setItem(key, stateToSave).catch(() => {});
  }
  if (safeTenant && activeTask?.id && user?.id) {
    if (remoteSaveTimerRef.current) window.clearTimeout(remoteSaveTimerRef.current);
    remoteSaveTimerRef.current = window.setTimeout(async () => {
      await supabase.from("studio_states").upsert({
        tenant_slug: safeTenant,
        task_id: activeTask.id,
        studio_type: "image",
        state: stateToSave,
        updated_at: new Date().toISOString(),
        created_by: user.id,
      }, { onConflict: "tenant_slug,task_id,studio_type" });
    }, 800);
  }
}, [characters, config, generalIdea, finalPrompt, negativePrompt, generatedResult, faceImage, bodyImage, productImage, clothingImage, styleImage, isStateLoaded, activeTenant, activeTask?.id, user?.id]);

useEffect(() => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
  if (!safeTenant || !activeTask?.id) return;
  supabase
    .from("approvals")
    .select("image_url, created_at")
    .eq("tenant_slug", safeTenant)
    .eq("task_id", activeTask.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .then(({ data }) => {
      const url = data?.[0]?.image_url;
      if (url) {
        const abs = toAbsoluteMediaUrl(url);
        setGeneratedResult(abs);
      }
    });
}, [activeTenant, activeTask?.id]);

const resetProjectState = () => {
setCharacters([initialChar]);
setConfig({ format: "Horizontal (16:9)", lighting: "", camera: "", style: "Fotorrealista", view: "", angle: "" });
setGeneralIdea(""); setFinalPrompt(""); setGeneratedResult(null); setActiveTask(null);
setFaceImage(null); setBodyImage(null); setProductImage(null); setClothingImage(null); setStyleImage(null);
toast.success("Área de trabalho limpa!");
};

const handleNewProject = () => {
setShowResetConfirmModal(true);
};

const handleApplyPreset = (preset: any) => {
setConfig(prev => ({ ...prev, ...preset.config }));
setGeneralIdea(prev => {
let base = prev || "";
SUPER_PRESETS.forEach(p => {
base = base.replace(`\n\n[Direção de Arte: ${p.magicPrompt}]`, "").replace(`[Direção de Arte: ${p.magicPrompt}]`, "");
});
base = base.trim();
return base ? `${base}\n\n[Direção de Arte: ${preset.magicPrompt}]` : `[Direção de Arte: ${preset.magicPrompt}]`;
});
toast.success(`Estilo '${preset.label}' injetado!`);
};

const handleInjectRandomPrompt = (category: string) => {
const options = PROMPT_LIBRARY[category];
if (!options || options.length === 0) return;
const selectedPrompt = options[Math.floor(Math.random() * options.length)];
setGeneralIdea(prev => {
let base = prev || "";
base = base
  .split("\n")
  .filter(line => !new RegExp(`^\\s*(\\[\\s*)?(Estilo\\s+${category}|Biblioteca\\s+${category})\\b`, "i").test(line))
  .join("\n")
  .trim();
const injected = sanitizePromptText(selectedPrompt);
return base ? `${base}\n\n${injected}` : injected;
});
toast.success(`Categoria '${category}' adicionada!`);
};

const openEditorWithDraft = async () => {
  if (!activeTask?.id) {
    setInitialDraft(null);
    setImageForEditing(generatedResult || "");
    setIsStudioOpen(true);
    return;
  }

  try {
    const { data: drafts } = await supabase
      .from("art_drafts")
      .select("elements,bg_color,canvas_format_id,updated_at")
      .eq("task_id", activeTask.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    let appliedDraft: any = null;
    if (drafts && drafts.length > 0) {
      const d = drafts[0];
      let elements = d.elements || [];
      if (typeof elements === "string") {
        try {
          elements = JSON.parse(elements);
        } catch {
          elements = [];
        }
      }
      appliedDraft = {
        elements: Array.isArray(elements) ? elements : [],
        bgColor: d.bg_color || "#ffffff",
        canvasFormatId: d.canvas_format_id || null,
      };
    }

    if (!appliedDraft) {
      const { data: approvals } = await supabase
        .from("approvals")
        .select("image_url,draft_payload")
        .eq("task_id", activeTask.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const approvalDraft = approvals?.[0]?.draft_payload || null;
      if (approvalDraft) {
        appliedDraft = {
          elements: Array.isArray(approvalDraft?.elements) ? approvalDraft.elements : [],
          bgColor: approvalDraft?.bgColor || "#ffffff",
          canvasFormatId: approvalDraft?.canvasFormatId || null,
        };
      }
    }

    setInitialDraft(appliedDraft);
  } catch {
    setInitialDraft(null);
  }

  setImageForEditing(generatedResult || "");
  setIsStudioOpen(true);
};

const handleDownloadMedia = async () => {
  if (!generatedResult) return;
  try {
    if (generatedResult.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = generatedResult;
      a.download = `IAGENCIA_${Date.now()}.png`;
      a.click();
      toast.success("Download iniciado!");
      return;
    }
    const res = await fetch(generatedResult);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IAGENCIA_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download iniciado!");
  } catch (err: any) {
    console.error("Falha ao baixar imagem:", err);
    toast.error("Não foi possível baixar a imagem.");
  }
};

const fetchTasks = async () => {
  let query = supabase.from("tasks").select("*").eq("department", "arte");
  if (activeTenant && activeTenant !== "all") {
    query = query.eq("tenant", activeTenant);
  }
  const { data } = await query;
  if (data) setTasks(data);
};

const handleDeleteTask = async (id: number) => {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTask?.id === id) setActiveTask(null);
    toast.success("Job removido.");
  } catch (err: any) {
    console.error("Erro ao excluir job:", err);
    toast.error(err?.message || "Erro ao excluir. Verifique permissões.");
    fetchTasks();
  }
};

useEffect(() => {
fetchTasks();
const channel = supabase.channel(`realtime:arte_tasks:${activeTenant || "all"}`)
.on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks", filter: "department=eq.arte" }, () => { fetchTasks(); toast.info("Novo Job na Direção de Arte!"); })
.on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks", filter: "department=eq.arte" }, () => { fetchTasks(); })
.on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks", filter: "department=eq.arte" }, () => { fetchTasks(); })
.subscribe();
return () => { supabase.removeChannel(channel); };
}, [activeTenant]);

const filteredTasks = useMemo(() => {
if (!activeTenant || activeTenant === "all") return tasks;
return tasks.filter(t => t.tenant === activeTenant);
}, [tasks, activeTenant]);

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.readAsDataURL(file);
reader.onload = (event) => {
const img = new Image();
img.src = event.target?.result as string;
img.onload = () => {
const canvas = document.createElement("canvas");
const MAX_SIZE = 1024;
let width = img.width; let height = img.height;
if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
canvas.width = width; canvas.height = height;
const ctx = canvas.getContext("2d");
ctx?.drawImage(img, 0, 0, width, height);
setter(canvas.toDataURL("image/jpeg", 0.8));
};
};
};

const handleEnhancePrompt = async () => {
if (!generalIdea.trim()) return toast.warning("Descreva o cenário/atmosfera primeiro.");
setIsThinking(true);
await new Promise(r => setTimeout(r, 600));

const parts: string[] = [];

// PERSONAGENS — prosa natural, sem labels ou dois pontos
characters.forEach((c) => {
  if (!c.physical_details && !c.clothing_details && !c.name) return;
  const subject = c.name || "A pessoa";
  const sentences: string[] = [];
  if (c.physical_details) {
    const phys = c.physical_details.trim().replace(/\.+$/, "");
    sentences.push(`${subject} é ${phys}`);
  }
  if (c.clothing_details) {
    sentences.push(`usa ${c.clothing_details.trim().replace(/\.+$/, "")}`);
  }
  const expAction = [
    c.expression ? `com expressão ${c.expression.trim()}` : "",
    c.action     ? `e está ${c.action.trim()}`            : "",
  ].filter(Boolean).join(" ");
  if (expAction) sentences.push(expAction);
  if (sentences.length > 0) parts.push(sentences.join(", ").replace(/,\s*$/, "") + ".");
});

// CENÁRIO — texto direto, sem chaves nem labels
const sceneText = generalIdea.trim().replace(/\.+$/, "");
if (sceneText) parts.push(sceneText + ".");

// COMPOSIÇÃO ESPACIAL — só se houver personagem e cenário
const hasChars = characters.some(c => c.physical_details || c.name);
if (hasChars && sceneText) {
  parts.push("A composição deixa claras as relações espaciais entre pessoa, objetos e ambiente com elementos em primeiro plano e ao fundo conforme descrito.");
}

// DIREÇÃO DE FOTOGRAFIA — prosa contínua, sem labels
const techBits = [
  config.style    ? `estilo ${config.style}`       : "",
  config.lighting ? `iluminação ${config.lighting}` : "",
  config.camera   ? `lente ${config.camera}`        : "",
  config.view     ? `visão ${config.view}`          : "",
  config.angle    ? `ângulo ${config.angle}`        : "",
].filter(Boolean);
if (techBits.length > 0) parts.push(`Direção de fotografia com ${techBits.join(" e ")}.`);

// QUALIDADE
parts.push("Fotografia crua sem recorte hiper realista com alto detalhe e textura cinematográfica.");

setFinalPrompt(parts.join(" ").replace(/\s+/g, " ").trim());
setIsThinking(false);
toast.success("Prompt Técnico montado!");
};

const handleGenerate = async () => {
if (!generalIdea.trim()) return toast.warning("Descreva o cenário/atmosfera primeiro.");

setIsGenerating(true);
setGeneratedResult(null);

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 90000) => {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error(`Timeout: O servidor demorou mais de ${timeoutMs/1000}s.`);
    throw err;
  } finally {
    window.clearTimeout(t);
  }
};

try {
  // DIMENSÕES OTIMIZADAS PARA GERAÇÃO
  const aspectRatios: Record<string, { w: number, h: number }> = {
    "Horizontal (16:9)": { w: 1344, h: 768 },
    "Vertical (9:16)": { w: 768, h: 1344 },
    "Quadrado (1:1)": { w: 1024, h: 1024 },
    "Feed Instagram (4:5)": { w: 1024, h: 1280 },
    "Ultrawide (21:9)": { w: 1536, h: 640 },
  };

  const dims = aspectRatios[config.format] || { w: 1024, h: 1024 };
  const finalEngine =
    selectedEngine === "replicate" ? "flux" :
    selectedEngine === "gemini" ? "gemini" :
    selectedEngine === "stability" ? "stability" :
    "nana";
  const tenantSlug = activeTenant && activeTenant !== "all" ? activeTenant : "mugo";

  // PAYLOAD ESTRUTURADO PARA O REFINER
  const payload = {
    tenant_slug: tenantSlug,
    media_type: "image",
    engine: finalEngine,
    prompt: finalPrompt,
    negative_prompt: negativePrompt,
    refiner_data: {
      idea: finalPrompt,
      characters: characters.map(c => ({
        name: c.name,
        physical: c.physical_details || "",
        clothing: c.clothing_details || "",
        expression: c.expression,
        action: c.action
      })),
      technical: {
        style: config.style,
        lighting: config.lighting,
        camera: config.camera,
        view: config.view,
        angle: config.angle,
        format: config.format,
      },
      context: {
        has_face_ref: !!faceImage,
        has_body_ref: !!bodyImage,
        has_product_ref: !!productImage,
        has_style_ref: !!styleImage
      },
      translate_only: true,
    },
    width: dims.w,
    height: dims.h,
    face_image: faceImage || null,
    body_image: bodyImage || null,
    product_image: productImage || null,
    clothing_image: clothingImage || null,
    style_image: styleImage || null,
    translate: true, 
  };

  const response = await fetchWithTimeout(`${API_BASE}${GENERATE_ENDPOINT}`, {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  }, 90000); 

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Erro desconhecido");
    throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  let media: string | null = null;

  if (contentType.includes("application/json")) {
    const parsed = await response.json();
    media = typeof parsed === "string" ? parsed : parsed?.url || parsed?.image_url || parsed?.media || null;
  } else {
    media = (await response.text()).trim();
  }

  if (!media) throw new Error("O servidor não retornou nenhuma mídia válida.");

  if (media && !media.startsWith("data:") && !media.startsWith("http") && media.length > 200) {
    media = `data:image/png;base64,${media}`;
  }

  if (media && media.startsWith("data:image")) {
    const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
    const upResponse = await fetchWithTimeout(`${API_BASE}/media/upload-base64`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_slug: safeTenant,
        filename_prefix: "studio_render",
        data_url: media,
      }),
    }, 20000);

    if (upResponse.ok) {
      const upJson = await upResponse.json();
      media = upJson?.url || media;
    }
  }

  const finalUrl = media!.startsWith("data:") ? media! : toAbsoluteMediaUrl(media!);
  setGeneratedResult(finalUrl);
  toast.success("Imagem gerada com sucesso!");

} catch (err: any) {
  console.error("Erro na geração:", err);
  toast.error(`Falha na criação: ${err.message}`);
} finally {
  setIsGenerating(false);
}
};

return (
<div className="flex flex-col h-full w-full bg-black text-white overflow-hidden">

  <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 shrink-0 bg-black z-20">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-purple-900/30 rounded-lg"><ImageIcon className="w-6 h-6 text-purple-500" /></div>
      <h1 className="text-lg font-bold">Estúdio de Imagem</h1>
    </div>
    <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-200 bg-purple-600 px-3 py-1.5 rounded border border-purple-800 hover:text-white transition">
      <Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher a Pauta" : "Ver a Pauta"}
      {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  </header>

  <div className="shrink-0">
    <KanbanBoard 
      isExpanded={isKanbanExpanded} onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)} tasks={filteredTasks} activeTask={activeTask}
      onTaskSelect={(task) => { setActiveTask(task); setIsViewingJob(true); }}
      onTaskDelete={handleDeleteTask}
      onTaskDrop={async (taskId, status) => { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t)); await updateTaskStatus(taskId, status); await fetchTasks(); }}
      onNewTaskClick={(status) => { setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] }); setEditingTaskId(null); setShowTaskModal(true); }}
      onTaskEdit={(task) => {
        setNewTaskData({ title: task.title || "", description: stripHtml(task.description || ""), formats: task.formats || [], status: task.status || "todo", assignees: task.assignees || [] });
        setEditingTaskId(task.id); setShowTaskModal(true);
      }}
    />
  </div>

  <div className="flex-1 flex min-h-0 overflow-hidden relative">
    
    <div className={`w-[440px] shrink-0 min-h-0 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto scrollbar-thin relative ${activeTask ? "pt-8" : ""}`}>
      
      {activeTask && (<div className="absolute top-0 left-0 w-full h-8 bg-purple-900/20 border-b border-purple-900/50 flex items-center justify-center text-[10px] text-purple-300 font-bold tracking-widest uppercase z-10">Trabalhando no Job: {activeTask.title}</div>)}

      {activeTask && (
        <div className="m-4 bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl shadow-inner shrink-0 overflow-hidden break-words">
          <button onClick={() => setIsBriefingExpanded(!isBriefingExpanded)} className="w-full flex justify-between items-center text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
            <span className="flex items-center gap-2"><FileText className="w-3 h-3"/> Pedido da Redação</span>
            {isBriefingExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {isBriefingExpanded && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 border-t border-blue-900/30 pt-3">
              {activeTask.briefing_data && Object.keys(activeTask.briefing_data).length > 0 ? (
                <div className="space-y-2 text-xs text-zinc-300">
                  <p><strong className="text-zinc-500">Objetivo:</strong> {activeTask.briefing_data.objective}</p>
                  <p><strong className="text-zinc-500">Mensagem:</strong> <em className="text-blue-200">"{activeTask.briefing_data.key_message}"</em></p>
                  {activeTask.briefing_data.tech_requirements && (
                     <p className="bg-black/50 p-2 rounded border border-zinc-800 text-[10px] text-zinc-400 font-mono mt-2">Ref: {activeTask.briefing_data.tech_requirements}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">{stripHtml(activeTask.description)}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40 sticky top-0 z-10">
        <span className="text-xs font-bold text-zinc-400 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Meus Setups</span>
        <div className="flex gap-2">
          <button onClick={handleNewProject} className="text-[10px] flex items-center gap-1 bg-zinc-800 hover:bg-red-600 hover:text-white px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 transition"><Eraser className="w-3 h-3" /> Novo</button>
          <button onClick={() => setShowLoadJobModal(true)} className="text-[10px] flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 transition"><FolderOpen className="w-3 h-3" /> Jobs</button>
          <button onClick={() => setShowLoadConfigModal(true)} className="text-[10px] flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 transition"><FolderOpen className="w-3 h-3" /> Carregar</button>
          <button onClick={() => setShowSaveConfigModal(true)} className="text-[10px] flex items-center gap-1 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 px-2 py-1.5 rounded text-purple-300 hover:text-white transition shadow-lg"><Save className="w-3 h-3" /> Salvar</button>
        </div>
      </div>

      <div className="border-b border-zinc-800 bg-zinc-950/80">
        <button onClick={() => setIsRefsOpen(!isRefsOpen)} className="w-full flex justify-between items-center p-4 text-xs font-bold text-purple-400 uppercase hover:bg-zinc-900/50 transition-colors">
          <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Imagens de Referência{hasActiveRefs && !isRefsOpen && (<span className="flex items-center gap-1 text-[9px] text-green-400 ml-2 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-500/30"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Ativas</span>)}</span>{isRefsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isRefsOpen && (
          <div className="px-5 pb-5 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-purple-500 transition cursor-pointer relative h-24 overflow-hidden group">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, setFaceImage)} />
                {faceImage ? <img src={faceImage} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-50 transition" /> : <User className="w-5 h-5 text-zinc-600 mb-1" />}
                <span className="text-[9px] font-bold text-zinc-300 relative z-0 bg-black/60 px-2 py-0.5 rounded shadow">@img1 (Rosto)</span>
              </div>
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-purple-500 transition cursor-pointer relative h-24 overflow-hidden group">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, setBodyImage)} />
                {bodyImage ? <img src={bodyImage} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-50 transition" /> : <UserCircle className="w-5 h-5 text-zinc-600 mb-1" />}
                <span className="text-[9px] font-bold text-zinc-300 relative z-0 bg-black/60 px-2 py-0.5 rounded shadow">@img2 (Estrutura)</span>
              </div>
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-purple-500 transition cursor-pointer relative h-24 overflow-hidden group">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, setProductImage)} />
                {productImage ? <img src={productImage} className="absolute inset-0 w-full h-full object-contain p-1 opacity-80 group-hover:opacity-50 transition" /> : <Package className="w-5 h-5 text-zinc-600 mb-1" />}
                <span className="text-[9px] font-bold text-zinc-300 relative z-0 bg-black/60 px-2 py-0.5 rounded shadow">@img3 (Produto)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-purple-500 transition cursor-pointer relative h-20 overflow-hidden group">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, setClothingImage)} />
                {clothingImage ? <img src={clothingImage} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-50 transition" /> : <Shirt className="w-5 h-5 text-zinc-600 mb-1" />}
                <span className="text-[9px] font-bold text-zinc-300 relative z-0 bg-black/60 px-2 py-0.5 rounded shadow">@img4 (Roupa)</span>
              </div>
              <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-purple-500 transition cursor-pointer relative h-20 overflow-hidden group">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageUpload(e, setStyleImage)} />
                {styleImage ? <img src={styleImage} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-50 transition" /> : <Palette className="w-5 h-5 text-zinc-600 mb-1" />}
                <span className="text-[9px] font-bold text-zinc-300 relative z-0 bg-black/60 px-2 py-0.5 rounded shadow">@img5 (Estilo/Luz)</span>
              </div>
            </div>
            {hasActiveRefs && (<button onClick={() => { setFaceImage(null); setBodyImage(null); setProductImage(null); setClothingImage(null); setStyleImage(null); }} className="text-[10px] text-red-400 hover:text-red-300 w-full text-right font-semibold pt-1">Limpar Referências</button>)}
          </div>
        )}
      </div>

      <CastingForm characters={characters} setCharacters={setCharacters} />

      <div className="p-5 space-y-6">
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
          <button onClick={() => setIsStylesOpen(!isStylesOpen)} className="w-full flex justify-between items-center p-3 text-xs font-bold text-zinc-300 uppercase hover:bg-zinc-900/80 transition-colors">
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-400" /> Categorias de Estilo</span>{isStylesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {isStylesOpen && (
            <div className="px-3 pb-4 pt-1 animate-in fade-in slide-in-from-top-2 border-t border-zinc-800/50">
              <div className="flex flex-wrap gap-2">
                {Object.keys(PROMPT_LIBRARY).map((category) => (
                  <button key={category} onClick={() => handleInjectRandomPrompt(category)} className="flex items-center gap-1.5 text-[10px] bg-zinc-800 hover:bg-purple-600 border border-zinc-700 hover:border-purple-500 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-full transition-colors"><Dices className="w-3 h-3 opacity-70" /> {category}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase block mb-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> Cenário & Atmosfera</label>
          <textarea
            className="w-full bg-white border border-zinc-300 rounded-xl p-3 text-sm text-black focus:border-purple-500 outline-none resize-none h-32 placeholder:text-zinc-500 shadow-inner"
            placeholder="Descreva ONDE acontece a cena e O QUE acontece..."
            value={generalIdea}
            onChange={(e) => setGeneralIdea(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-500">Engine</label>
            <select
              className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500"
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value as any)}
            >
              <option value="replicate">Replicate (Flux)</option>
              {SHOW_OTHER_ENGINES && (
                <>
                  <option value="nana">Nana Banana</option>
                  <option value="gemini">Gemini</option>
                  <option value="stability">Stability</option>
                </>
              )}
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">Provider ativo: {selectedEngine === "replicate" ? "Replicate" : selectedEngine}</p>
          </div>
          <div><label className="text-[10px] font-bold text-zinc-500">Formato</label><select className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500" value={config.format} onChange={(e) => setConfig({ ...config, format: e.target.value })}>{CONSTANTS.FORMATOS.map((f) => (<option key={f} value={f}>{f}</option>))}</select></div>
          <div><label className="text-[10px] font-bold text-zinc-500">Estilo</label><select className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500" value={config.style} onChange={(e) => setConfig({ ...config, style: e.target.value })}>{CONSTANTS.ESTILOS.map((f) => (<option key={f} value={f}>{f}</option>))}</select></div>
          <div><label className="text-[10px] font-bold text-zinc-500">Câmera</label><select className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500" value={config.camera} onChange={(e) => setConfig({ ...config, camera: e.target.value })}><option value="">Auto</option>{CONSTANTS.CAMERA.map((f) => (<option key={f} value={f}>{f}</option>))}</select></div>
          <div><label className="text-[10px] font-bold text-zinc-500">Iluminação</label><select className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500" value={config.lighting} onChange={(e) => setConfig({ ...config, lighting: e.target.value })}><option value="">Auto</option>{CONSTANTS.ILUMINACAO.map((f) => (<option key={f} value={f}>{f}</option>))}</select></div>
          <div><label className="text-[10px] font-bold text-zinc-500">Visão</label><select className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500" value={config.view} onChange={(e) => setConfig({ ...config, view: e.target.value })}><option value="">Auto</option>{CONSTANTS.VISOES.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}</select></div>
          <div><label className="text-[10px] font-bold text-zinc-500">Ângulo</label><select className="w-full bg-black border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none focus:border-purple-500" value={config.angle} onChange={(e) => setConfig({ ...config, angle: e.target.value })}><option value="">Auto</option>{CONSTANTS.ANGULOS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}</select></div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={async () => { await loadVersions(); setShowVersionModal(true); }} className="text-xs h-8 bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700">
            Histórico de Versões
          </Button>
          <Input
            className="bg-black border-zinc-700 text-white text-xs h-8"
            placeholder="Nome da versão (opcional)"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
          />
          <Button onClick={handleSaveVersion} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500">
            Salvar Versão
          </Button>
        </div>

        <Button onClick={handleEnhancePrompt} disabled={isThinking} className="w-full text-xs h-9 mt-4 bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 text-zinc-300">{isThinking ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />} Montar Prompt Técnico</Button>

        <div className={`transition-opacity duration-300 space-y-2 ${finalPrompt ? "opacity-100" : "opacity-50"}`}>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Prompt Final Editável</label>
            <button
              onClick={async () => {
                if (!finalPrompt.trim()) return toast.error("Prompt vazio.");
                try {
                  await navigator.clipboard.writeText(finalPrompt);
                  toast.success("Prompt copiado!");
                } catch {
                  toast.error("Falha ao copiar prompt.");
                }
              }}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
            >
              Copiar Prompt
            </button>
          </div>
          <textarea
            className="w-full bg-white rounded-xl p-3 text-xs font-medium outline-none resize-none border border-zinc-300 text-black focus:border-purple-500 h-28 shadow-inner"
            value={finalPrompt}
            onChange={(e) => setFinalPrompt(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Eraser className="w-3 h-3 text-red-400" />
            <input className="bg-transparent border-b border-zinc-800 text-[10px] text-red-300 w-full focus:outline-none focus:border-red-500" placeholder="Prompt Negativo (o que não deve aparecer na imagem)..." value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating || !finalPrompt} className="w-full h-12 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform bg-gradient-to-r from-purple-600 to-indigo-600 text-white">{isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Renderizando Imagem...</> : "Gerar Imagem"}</Button>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <Button onClick={() => { setInitialDraft(null); setImageForEditing(""); setIsStudioOpen(true); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-10 border border-zinc-700 shadow-sm transition-colors"><Edit3 className="w-4 h-4 mr-2" /> Abrir Studio Manualmente</Button>
        </div>
      </div>
    </div>

    <div className={`flex-1 min-h-0 bg-[#111] flex flex-col relative items-center justify-center p-10 overflow-y-auto ${activeTask ? "pt-16" : ""}`}>
      {generatedResult ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-5xl animate-in fade-in zoom-in duration-500">
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 p-2 rounded-full flex items-center gap-2 shadow-2xl z-20">
            <button onClick={() => { setBodyImage(generatedResult); setIsRefsOpen(true); toast.success("Definida como Estrutura (@img2)!"); }} className="px-4 py-2 rounded-full text-xs font-bold bg-blue-900/30 border border-blue-500/50 text-blue-300 hover:text-white hover:bg-blue-600 transition-all flex items-center gap-2"><Recycle className="w-3 h-3" /> Usar como Estrutura</button>
            <button
              onClick={openEditorWithDraft}
              className="px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all flex items-center gap-2"
            >
              <Edit3 className="w-3 h-3" /> Abrir no Editor
            </button>
            <button onClick={handleDownloadMedia} className="p-2 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"><Download className="w-4 h-4" /></button>
          </div>
          <div className="relative w-full flex justify-center">
            <div className="relative group max-h-[75vh] shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50 flex items-center justify-center min-w-[300px]">
              <img src={generatedResult} className="max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center flex flex-col items-center justify-center bg-zinc-900/40 border border-zinc-800 p-10 rounded-3xl max-w-md shadow-2xl animate-in fade-in">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-700 shadow-inner"><Palette className="w-10 h-10 text-zinc-500" /></div>
          <h3 className="text-xl font-bold text-zinc-200 mb-3">Estúdio de Imagem</h3>
          <p className="text-sm text-zinc-500 mb-8 max-w-xs leading-relaxed">Defina os atores, monte o cenário, trave a iluminação e deixe a IA gerar a imagem.</p>
        </div>
      )}
    </div>

  </div>

  
{isStudioOpen && (
<StudioEditor
baseImage={imageForEditing || generatedResult || ""}
onClose={() => {
setIsStudioOpen(false);
}}
onAutoSaveDraft={(draft) => setInitialDraft(draft)}
onAutoSaveRender={(dataUrl) => {
setGeneratedResult(dataUrl);
setImageForEditing(dataUrl);
}}
onSaveToLibrary={async (dataUrl) => {
const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";

  if (!activeTask?.id) {
    toast.error("Selecione um Job no Kanban antes de enviar.");
    throw new Error("activeTask ausente");
  }
  if (!safeTenant) {
    toast.error("Selecione um cliente antes de enviar.");
    throw new Error("tenant ausente");
  }

  const { error } = await supabase.from("library").insert([
    {
      tenant_slug: safeTenant,
      url: dataUrl,
      type: "image",
      task_id: activeTask.id,
      title: activeTask.title || "Arte",
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    throw new Error(error.message || "Erro ao salvar na Biblioteca.");
  }

  await updateTaskStatus(activeTask.id, "review");

  toast.success("Arte enviada para Bibloteca!");
}}
onSaveToApproval={async (dataUrl, draft) => {
  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";

  if (!activeTask?.id) {
    toast.error("Selecione um Job no Kanban antes de enviar.");
    throw new Error("activeTask ausente");
  }
  if (!safeTenant) {
    toast.error("Selecione um cliente antes de enviar.");
    throw new Error("tenant ausente");
  }

  let finalImageUrl = dataUrl;
  if (dataUrl.startsWith("data:")) {
    const up = await fetch(`${API_BASE}/api/media/upload-base64`, {
      method: "POST",
      headers: await getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        tenant_slug: safeTenant,
        filename_prefix: "aprovacao",
        data_url: dataUrl,
      }),
    });
    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      throw new Error(`Erro HTTP ${up.status} ${txt}`);
    }
    const upJson = await up.json();
    finalImageUrl = toAbsoluteMediaUrl(upJson.url || "");
  } else {
    finalImageUrl = toAbsoluteMediaUrl(dataUrl);
  }

  if (draft) {
    try {
      await supabase.from("art_drafts").upsert(
        {
          task_id: activeTask.id,
          tenant_slug: safeTenant,
          elements: draft.elements,
          bg_color: draft.bgColor,
          canvas_format_id: draft.canvasFormatId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "task_id" }
      );
    } catch {}
  }

  let { error } = await supabase.from("approvals").insert([
    {
      task_id: activeTask.id,
      tenant_slug: safeTenant,
      type: "image",
      image_url: finalImageUrl,
      status: "pending",
      draft_payload: draft || null,
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    // fallback se a coluna draft_payload ainda não existe no Supabase
    if (error.message && error.message.includes("draft_payload")) {
      const retry = await supabase.from("approvals").insert([
        {
          task_id: activeTask.id,
          tenant_slug: safeTenant,
          type: "image",
          image_url: finalImageUrl,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);
      if (retry.error) throw new Error(retry.error.message || "Erro ao salvar aprovação.");
      toast.warning("Aprovação salva sem edição (coluna draft_payload ausente).");
    } else {
      throw new Error(error.message || "Erro ao salvar aprovação.");
    }
  }

  await supabase.from("tasks").update({ status: "doing" }).eq("id", activeTask.id);

  setGeneratedResult(finalImageUrl);
  setPendingJobPayload({
    characters,
    config,
    generalIdea,
    finalPrompt,
    negativePrompt,
    faceImage,
    bodyImage,
    productImage,
    clothingImage,
    styleImage,
    generatedResult: finalImageUrl,
    draft: draft || null,
  });
  setJobNameInput(activeTask?.title || "Job de Imagem");
  setShowSaveJobModal(true);
  toast.success("Arte enviada para aprovação!");
}}
onSaveDraft={async (draftPayload: any) => {
  setPendingDraftPayload(draftPayload);
  setDraftNameInput(activeTask?.title || "");
  setShowSaveDraftModal(true);
}}
initialDraft={initialDraft}
autosaveKey={String(activeTask?.id || "no-task")}
/>
)}

  {showResetConfirmModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[420px] shadow-2xl">
        <h2 className="text-white font-bold text-lg">Novo projeto</h2>
        <p className="text-zinc-400 text-sm mt-2">Isso vai limpar o setup atual e as referências carregadas. Deseja continuar?</p>
        <div className="flex gap-3 mt-6"><Button onClick={() => setShowResetConfirmModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">Cancelar</Button><Button onClick={() => { resetProjectState(); setShowResetConfirmModal(false); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">Limpar Job</Button></div>
      </div>
    </div>
  )}

  {showSaveConfigModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[420px] shadow-2xl">
        <h2 className="text-white font-bold text-lg">Salvar setup de prompt</h2>
        <div className="mt-4"><label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do setup</label><input className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 focus:outline-none focus:border-purple-500" placeholder="Ex: KV Estilo Neon" value={configNameInput} onChange={(e) => setConfigNameInput(e.target.value)} /></div>
        <div className="flex gap-3 mt-6"><Button onClick={() => { setShowSaveConfigModal(false); setConfigNameInput(""); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">Cancelar</Button><Button onClick={() => { const cfg = configNameInput.trim(); if(!cfg) return toast.error("Nome obrigatório"); const nc = { id: Date.now(), name: cfg, date: new Date().toLocaleDateString("pt-BR"), characters, config, generalIdea, negativePrompt }; const up = [nc, ...savedConfigs]; setSavedConfigs(up); localStorage.setItem("iagencia_saved_configs", JSON.stringify(up)); toast.success("Setup salvo!"); setShowSaveConfigModal(false); setConfigNameInput(""); }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold">Salvar</Button></div>
      </div>
    </div>
  )}

  {showSaveDraftModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[420px] shadow-2xl">
        <h2 className="text-white font-bold text-lg">Salvar projeto editável</h2>
        <div className="mt-4"><label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do projeto</label><input className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 focus:outline-none focus:border-purple-500" placeholder="Ex: Post Cliente X" value={draftNameInput} onChange={(e) => setDraftNameInput(e.target.value)} /></div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => { setShowSaveDraftModal(false); setPendingDraftPayload(null); setDraftNameInput(""); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">Cancelar</Button>
          <Button
            onClick={async () => {
              const dn = draftNameInput.trim();
              if (!dn || !pendingDraftPayload) return toast.error("Dados inválidos");
              const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
              if (!safeTenant) return toast.error("Selecione um cliente antes de salvar.");
              toast.loading("Salvando...", { id: "draft" });
              const tid = activeTask ? activeTask.id : `avulso_${Date.now()}`;
              const nd = { id: Date.now(), name: dn, date: new Date().toLocaleDateString("pt-BR"), payload: pendingDraftPayload, taskId: tid };
              const ud = [nd, ...savedDrafts];
              setSavedDrafts(ud);
              localStorage.setItem("iagencia_saved_drafts", JSON.stringify(ud));
              setShowSaveDraftModal(false);
              setPendingDraftPayload(null);
              setDraftNameInput("");
              try {
                if (supabase && activeTask) {
                  await supabase.from("art_drafts").upsert({
                    task_id: tid,
                    tenant_slug: safeTenant,
                    elements: pendingDraftPayload.elements,
                    bg_color: pendingDraftPayload.bgColor,
                    canvas_format_id: pendingDraftPayload.canvasFormatId,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: "task_id" });
                }
                toast.success("Salvo!", { id: "draft" });
              } catch (err) {
                toast.success("Salvo localmente!", { id: "draft" });
              }
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )}

  {showSaveJobModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[420px] shadow-2xl">
        <h2 className="text-white font-bold text-lg">Salvar Job</h2>
        <div className="mt-4"><label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do Job</label><input className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 focus:outline-none focus:border-purple-500" placeholder="Ex: KV Cliente X" value={jobNameInput} onChange={(e) => setJobNameInput(e.target.value)} /></div>
        <div className="flex gap-3 mt-6"><Button onClick={() => { setShowSaveJobModal(false); setPendingJobPayload(null); setJobNameInput(""); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">Cancelar</Button><Button onClick={() => { const name = jobNameInput.trim(); if(!name || !pendingJobPayload) return toast.error("Dados inválidos"); handleSaveJobSnapshot(pendingJobPayload, name); setShowSaveJobModal(false); setPendingJobPayload(null); setJobNameInput(""); toast.success("Job salvo!"); }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold">Salvar</Button></div>
      </div>
    </div>
  )}

  {showVersionModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[520px] shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-white font-bold text-lg">Histórico de Versões</h2>
          <button onClick={() => setShowVersionModal(false)} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {versions.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">Nenhuma versão salva.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {versions.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                <div>
                  <p className="text-white text-sm font-semibold">{v.label || "Versão sem nome"}</p>
                  <p className="text-zinc-500 text-[10px]">{new Date(v.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleLoadVersion(v)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3">Abrir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

  {showLoadJobModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[480px] shadow-2xl">
        <div className="flex justify-between items-center mb-5"><h2 className="text-white font-bold text-lg">Jobs Salvos</h2><button onClick={() => setShowLoadJobModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
        {savedJobs.length === 0 ? (<p className="text-zinc-500 text-sm text-center py-8">Nenhum job salvo ainda.</p>) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {savedJobs.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                <div>
                  <p className="text-white text-sm font-semibold">{job.name}</p>
                  <p className="text-zinc-500 text-[10px]">{job.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleLoadJobSnapshot(job)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3">Abrir</Button>
                  <Button onClick={() => { const ud = savedJobs.filter((j) => j.id !== job.id); setSavedJobs(ud); localStorage.setItem("iagencia_saved_image_jobs", JSON.stringify(ud)); }} className="bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white text-xs h-8 px-3 border border-red-800">Apagar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

  {showLoadConfigModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[480px] shadow-2xl">
        <div className="flex justify-between items-center mb-5"><h2 className="text-white font-bold text-lg">Carregar Setup de Prompt</h2><button onClick={() => setShowLoadConfigModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
        {savedConfigs.length === 0 ? (<p className="text-zinc-500 text-sm text-center py-8">Nenhum setup salvo ainda.</p>) : (<div className="space-y-2 max-h-80 overflow-y-auto">{savedConfigs.map((cfg: any) => (<div key={cfg.id} className="flex items-center justify-between bg-zinc-800 rounded-xl p-3 border border-zinc-700"><div><p className="text-white text-sm font-semibold">{cfg.name}</p><p className="text-zinc-500 text-[10px]">{cfg.date}</p></div><div className="flex gap-2"><Button onClick={() => { setCharacters(cfg.characters || [initialChar]); setConfig(cfg.config || config); setGeneralIdea(cfg.generalIdea || ""); setNegativePrompt(cfg.negativePrompt || ""); setShowLoadConfigModal(false); toast.success(`Setup "${cfg.name}" carregado!`); }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3">Usar</Button><Button onClick={() => { const ud = savedConfigs.filter(c => c.id !== cfg.id); setSavedConfigs(ud); localStorage.setItem("iagencia_saved_configs", JSON.stringify(ud)); }} className="bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white text-xs h-8 px-3 border border-red-800">Apagar</Button></div></div>))}</div>)}
      </div>
    </div>
  )}

  {showLoadDraftModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[480px] shadow-2xl">
        <div className="flex justify-between items-center mb-5"><h2 className="text-white font-bold text-lg">Carregar Projeto Editável</h2><button onClick={() => setShowLoadDraftModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
        {savedDrafts.length === 0 ? (<p className="text-zinc-500 text-sm text-center py-8">Nenhum projeto salvo ainda.</p>) : (<div className="space-y-2 max-h-80 overflow-y-auto">{savedDrafts.map((draft: any) => (<div key={draft.id} className="flex items-center justify-between bg-zinc-800 rounded-xl p-3 border border-zinc-700"><div><p className="text-white text-sm font-semibold">{draft.name}</p><p className="text-zinc-500 text-[10px]">{draft.date}</p></div><div className="flex gap-2"><Button onClick={() => { setInitialDraft(draft.payload); setImageForEditing(""); setIsStudioOpen(true); setShowLoadDraftModal(false); toast.success(`Projeto "${draft.name}" carregado!`); }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3">Abrir</Button><Button onClick={() => { const ud = savedDrafts.filter(d => d.id !== draft.id); setSavedDrafts(ud); localStorage.setItem("iagencia_saved_drafts", JSON.stringify(ud)); }} className="bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white text-xs h-8 px-3 border border-red-800">Apagar</Button></div></div>))}</div>)}
      </div>
    </div>
  )}

  {showTaskModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[500px] shadow-2xl">
        <div className="flex justify-between items-center mb-5"><h2 className="text-white font-bold text-lg">{editingTaskId ? "Editar Job" : "Novo Job de Arte"}</h2><button onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
        <div className="space-y-4">
          <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Título do Job</label><input className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 focus:outline-none focus:border-purple-500" value={newTaskData.title} onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: KV Campanha Dia das Mães" /></div>
          <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Briefing</label><textarea className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 h-24 resize-none focus:outline-none focus:border-purple-500" value={newTaskData.description as string} onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value as any }))} placeholder="Descreva o job..." /></div>
          <div><label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Formatos</label><div className="flex flex-wrap gap-2">{TASK_FORMATS.map(f => (<button key={f} onClick={() => setNewTaskData(prev => ({ ...prev, formats: prev.formats.includes(f) ? prev.formats.filter(x => x !== f) : [...prev.formats, f] }))} className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${newTaskData.formats.includes(f) ? "bg-purple-600 border-purple-500 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"}`}>{f}</button>))}</div></div>
          <div><label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Responsável</label><div className="flex gap-2">{EQUIPE.map(m => (<button key={m.id} onClick={() => setNewTaskData(prev => ({ ...prev, assignees: prev.assignees.includes(m.id) ? prev.assignees.filter(x => x !== m.id) : [...prev.assignees, m.id] }))} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${newTaskData.assignees.includes(m.id) ? "bg-blue-600 border-blue-500 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"}`}>{m.label}</button>))}</div></div>
          <select className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-zinc-300" value={newTaskData.status} onChange={(e) => setNewTaskData(prev => ({ ...prev, status: e.target.value }))}>{KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">Cancelar</Button>
          <Button
            onClick={async () => {
              if (!newTaskData.title.trim()) return toast.error("Título obrigatório.");
              const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";
              if (!safeTenant) return toast.error("Selecione um cliente antes de criar um job.");
              const payload = { tenant: safeTenant, department: "arte", created_by: user?.id || null, ...newTaskData };
              if (editingTaskId) {
                await supabase.from("tasks").update(payload).eq("id", editingTaskId);
                toast.success("Tarefa atualizada!");
              } else {
                await supabase.from("tasks").insert([payload]);
                toast.success("Nova tarefa criada!");
              }
              fetchTasks(); setShowTaskModal(false); setEditingTaskId(null);
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {editingTaskId ? "Salvar Alterações" : "Criar Job"}
          </Button>
        </div>
      </div>
    </div>
  )}

</div>
);
}

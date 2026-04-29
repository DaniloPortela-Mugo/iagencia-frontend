import React, { useEffect, useMemo, useState, useRef } from "react";
import localforage from "localforage";
import {
  Film,
  MonitorPlay,
  Layout,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
  Mic,
  Layers,
  Save,
  FolderOpen,
  Eraser,
  User,
  MapPin,
  Send,
  Download,
  Library,
  Music,
  Upload,
  Trash2,
} from "lucide-react";

// === IMPORTS VITAIS ===
import { KanbanBoard } from "../components/KanbanBoard";
import { CastingForm, initialChar } from "../components/Studio/CastingForm";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { buildVideoPrompt, buildVideoPromptPt, VIDEO_PLATFORMS } from "../lib/platformConfig";
import { PlatformSelector } from "../components/Studio/PlatformSelector";

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
const GENERATE_ENDPOINT = "/creation/generate-video";

function toAbsoluteMediaUrl(url: string) {
  const normalized = (url || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("data:")) return normalized;
  if (normalized.startsWith("blob:")) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;
  if (normalized.startsWith(`${API_BASE}http`)) return normalized.slice(normalized.indexOf("http", API_BASE.length));
  if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/${normalized.replace(/^\/+/, "")}`;
}

const getAuthHeaders = async (extra?: Record<string, string>) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const CONSTANTS = {
  FORMATOS: [
    "Horizontal (16:9)",
    "Vertical (9:16)",
    "Quadrado (1:1)",
    "Feed Instagram (4:5)",
    "Ultrawide (21:9)",
  ],
  ILUMINACAO: [
    "Cinematic",
    "Natural",
    "Neon",
    "Studio",
    "Golden Hour",
    "Dramática",
    "Volumétrica",
    "Cyberpunk",
    "Rembrandt",
    "Softbox",
    "Flash Direto",
  ],
  CAMERA: [
    "Arri Alexa",
    "RED Raptor",
    "Canon R5",
    "Sony a7S",
    "35mm",
    "85mm",
    "Anamorphic",
    "Macro",
    "Drone",
    "GoPro",
    "FPV",
  ],
  ESTILOS: [
    "Fotorrealista",
    "Cinematográfico",
    "Editorial de Moda",
    "Product Shot",
    "3D Render",
    "Anime",
    "Cyberpunk",
  ],
  RITMO: ["Normal", "Slow Motion Cinemático", "Fast-paced (Dinâmico)", "Time-lapse"

  ],
  MOVIMENTO: [
    "Drone Flyover",
    "Pan Left",
    "Pan Right",
    "Tilt Up",
    "Tilt Down",
    "Zoom In",
    "Zoom Out",
    "Tracking Shot",
    "Handheld/Tremedo",
    "Estático",
    "Fpv",
  ],

  TIME_OF_DAY: ["Manhã", "Tarde", "Fim de Tarde", "Noite", "Madrugada"],
  COLOR_GRADE: [
    "Clean e Natural",
    "Warm Pastel",
    "Cool Clean",
    "High Contrast Cinematic",
    "Soft Matte Film",
    "Vibrant Commercial",
  ],
  TONE: [
    "Luxo Publicitário",
    "Inspirador e Próximo",
    "Clean e Profissional",
    "Documental Natural",
    "Tech / Futurista",
    "Fashion Editorial",
  ],
};

const EQUIPE = [
  { id: "rodrigo", label: "Rodrigo (RTV)" },
  { id: "danilo", label: "Danilo (Arte)" },
];

const TASK_FORMATS = ["Reels", "Institucional", "Comercial", "Story", "Manifesto"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

function normalizePromptTrait(value: string) {
  return (value || "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function formatBeardTrait(raw: string) {
  const value = normalizePromptTrait(raw).toLowerCase();
  if (!value) return "";
  if (value.includes("sem barba") || value.includes("rosto liso")) {
    return "sem barba, rosto liso";
  }
  return `barba ${normalizePromptTrait(raw)}`;
}

export default function VideoStudio() {
  const { activeTenant, user } = useAuth();
  const editorName = user?.name || "Sistema";

  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [isScriptExpanded, setIsScriptExpanded] = useState(true); // Guia retrátil
  const [isRefsOpen, setIsRefsOpen] = useState(false);

  const stripHtml = (html?: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "").replace(/\s+\n/g, "\n").trim();
  };

  // --- ESTADOS DE DADOS ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    formats: [] as string[],
    status: "todo",
    assignees: [] as string[],
  });
  const [selectedEngine, setSelectedEngine] = useState("kling");
  const [generalIdea, setGeneralIdea] = useState("");
  const [finalPrompt, setFinalPrompt] = useState("");      // PT — exibido ao usuário
  const [finalPromptEn, setFinalPromptEn] = useState(""); // EN — enviado à API
  const [finalPromptFormat, setFinalPromptFormat] = useState<"text" | "json">("text");
  const [negativePrompt, setNegativePrompt] = useState(
    "texto, letras, logotipo, marca d'água, assinatura, borda decorativa, watermark, logo, low quality, deformed"
  );
  const [ttsText, setTtsText] = useState("");
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [showSaveJobModal, setShowSaveJobModal] = useState(false);
  const [showLoadJobModal, setShowLoadJobModal] = useState(false);
  const [jobNameInput, setJobNameInput] = useState("");
  const [pendingJobPayload, setPendingJobPayload] = useState<any>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [versions, setVersions] = useState<any[]>([]);
  const [veoPromptJsonPt, setVeoPromptJsonPt] = useState("");
  const [veoJsonVersions, setVeoJsonVersions] = useState<any[]>([]);
  const [showVeoJsonHistory, setShowVeoJsonHistory] = useState(false);
  const draftSaveTimerRef = useRef<number | null>(null);

  // --- CONFIGURAÇÕES TÉCNICAS ---
  const [config, setConfig] = useState({
    format: "Horizontal (16:9)",
    lighting: "",
    camera: "",
    style: "Cinematográfico",
    view: "",
    angle: "",
    pacing: "Normal",
    movement: "Estático",
    location: "",
    time_of_day: "Manhã",
    color_grade: "Clean e Natural",
    tone: "Luxo Publicitário",
    environment: "",
  });
  const [characters, setCharacters] = useState<any[]>([initialChar]);

  // --- REFERÊNCIAS VISUAIS ---
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);

  // --- ÁUDIO (EXCLUSIVO VEO) ---
  // Mantendo o mesmo estado e parâmetro "audio_url" no payload, mas agora com dataURL real.
  const [audioFile, setAudioFile] = useState<string | null>(null);

  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const storageErrorToastShownRef = useRef(false);
  const remoteSaveTimerRef = useRef<number | null>(null);

  const safeTenant = activeTenant && activeTenant !== "all" ? activeTenant : "";

  const getStateKey = (tenant?: string | null, taskId?: number | null) => {
    const t = tenant || "no-tenant";
    const id = taskId || "no-task";
    return `iagencia_video_studio_state_${t}_${id}`;
  };

  const fetchTasks = async () => {
    let query = supabase.from("tasks").select("*").eq("department", "producao");
    if (activeTenant && activeTenant !== "all") {
      query = query.eq("tenant", activeTenant);
    }
    const { data } = await query;
    if (data) setTasks(data);
  };

  useEffect(() => {
    let mounted = true;
    localforage
      .getItem("iagencia_saved_video_jobs")
      .then((data: any) => {
        if (!mounted) return;
        if (Array.isArray(data)) {
          setSavedJobs(data);
          return;
        }
        const raw = localStorage.getItem("iagencia_saved_video_jobs");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setSavedJobs(parsed);
              localforage.setItem("iagencia_saved_video_jobs", parsed).catch(() => {});
            }
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Carrega estado global no mount (sem depender de tenant/task)
  useEffect(() => {
    let mounted = true;
    localforage.getItem("iagencia_video_studio_state").then((saved: any) => {
      if (!mounted || !saved) return;
      if (saved.characters) setCharacters(saved.characters);
      if (saved.config) setConfig(saved.config);
      if (saved.generalIdea) setGeneralIdea(saved.generalIdea);
      if (saved.finalPrompt) setFinalPrompt(saved.finalPrompt);
      if (saved.finalPromptEn) setFinalPromptEn(saved.finalPromptEn);
      if (saved.negativePrompt) setNegativePrompt(saved.negativePrompt);
      if (saved.ttsText) setTtsText(saved.ttsText);
      if (saved.faceImage) setFaceImage(saved.faceImage);
      if (saved.bodyImage) setBodyImage(saved.bodyImage);
      if (saved.productImage) setProductImage(saved.productImage);
      if (saved.clothingImage) setClothingImage(saved.clothingImage);
      if (saved.styleImage) setStyleImage(saved.styleImage);
      if (saved.audioFile) setAudioFile(saved.audioFile);
      if (saved.selectedEngine) setSelectedEngine(saved.selectedEngine);
      if (saved.veoPromptJsonPt) setVeoPromptJsonPt(saved.veoPromptJsonPt);
      if (saved.finalPromptFormat) setFinalPromptFormat(saved.finalPromptFormat);
      if (saved.generatedResult) setGeneratedResult(saved.generatedResult);
    }).finally(() => {
      if (mounted) setIsStateLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  // Carrega último vídeo gerado da library quando tenant muda
  useEffect(() => {
    if (!safeTenant) return;
    supabase
      .from("library")
      .select("url, created_at")
      .eq("tenant_slug", safeTenant)
      .eq("type", "video")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const url = data?.[0]?.url || null;
        if (url) setGeneratedResult(url);
      });
  }, [safeTenant]);

  useEffect(() => {
    if (!safeTenant || !activeTask?.id) return;
    const key = getStateKey(safeTenant, activeTask.id);
    localforage.getItem(key).then((savedState: any) => {
      if (!savedState) return;
      if (savedState.characters) setCharacters(savedState.characters);
      if (savedState.config) setConfig(savedState.config);
      setGeneralIdea(savedState.generalIdea || "");
      setFinalPrompt(savedState.finalPrompt || "");
      setFinalPromptEn(savedState.finalPromptEn || "");
      setNegativePrompt(savedState.negativePrompt || "");
      setTtsText(savedState.ttsText || "");
      setFaceImage(savedState.faceImage || null);
      setBodyImage(savedState.bodyImage || null);
      setProductImage(savedState.productImage || null);
      setClothingImage(savedState.clothingImage || null);
      setStyleImage(savedState.styleImage || null);
      setAudioFile(savedState.audioFile || null);
      setSelectedEngine(savedState.selectedEngine || "kling");
      setVeoPromptJsonPt(savedState.veoPromptJsonPt || "");
      setFinalPromptFormat(savedState.finalPromptFormat || "text");
      setGeneratedResult(savedState.generatedResult || null);
    }).catch(() => {});
  }, [safeTenant, activeTask?.id]);

  useEffect(() => {
    if (!safeTenant || !activeTask?.id) return;
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
        if (saved.generalIdea !== undefined) setGeneralIdea(saved.generalIdea);
        if (saved.finalPrompt !== undefined) setFinalPrompt(saved.finalPrompt);
        if (saved.finalPromptFormat) setFinalPromptFormat(saved.finalPromptFormat);
        if (saved.veoPromptJsonPt !== undefined) setVeoPromptJsonPt(saved.veoPromptJsonPt);
      });
  }, [safeTenant, activeTask?.id]);

  useEffect(() => {
    if (!safeTenant || !activeTask?.id) return;
    const stateToSave = {
      generalIdea,
      finalPrompt,
      finalPromptEn,
      finalPromptFormat,
      veoPromptJsonPt,
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
  }, [generalIdea, finalPrompt, finalPromptFormat, veoPromptJsonPt, safeTenant, activeTask?.id, user?.id]);

  useEffect(() => {
    if (!safeTenant || !activeTask?.id) return;
    supabase
      .from("studio_states")
      .select("state")
      .eq("tenant_slug", safeTenant)
      .eq("task_id", activeTask.id)
      .eq("studio_type", "video")
      .maybeSingle()
      .then(({ data }) => {
        const savedState = data?.state as any;
        if (!savedState) return;
        if (savedState.characters) setCharacters(savedState.characters);
        if (savedState.config) setConfig(savedState.config);
        setGeneralIdea(savedState.generalIdea || "");
        setFinalPrompt(savedState.finalPrompt || "");
      setFinalPromptEn(savedState.finalPromptEn || "");
        setNegativePrompt(savedState.negativePrompt || "");
        setTtsText(savedState.ttsText || "");
        setFaceImage(savedState.faceImage || null);
        setBodyImage(savedState.bodyImage || null);
        setProductImage(savedState.productImage || null);
        setClothingImage(savedState.clothingImage || null);
        setStyleImage(savedState.styleImage || null);
        setAudioFile(savedState.audioFile || null);
        setSelectedEngine(savedState.selectedEngine || "kling");
        setFinalPromptFormat(savedState.finalPromptFormat || "text");
        setGeneratedResult(savedState.generatedResult || null);
      });
  }, [safeTenant, activeTask?.id]);

  useEffect(() => {
    if (!isStateLoaded) return;
    const stateToSave = {
      characters, config, generalIdea, finalPrompt, negativePrompt,
      ttsText, faceImage, bodyImage, productImage, clothingImage, styleImage,
      audioFile, selectedEngine, generatedResult, veoPromptJsonPt, finalPromptFormat,
      finalPromptEn,
    };
    localforage.setItem("iagencia_video_studio_state", stateToSave).catch(() => {});
    const key = getStateKey(safeTenant, activeTask?.id || null);
    localforage.setItem(key, stateToSave).catch(() => {
      if (!storageErrorToastShownRef.current) {
        storageErrorToastShownRef.current = true;
        toast.error("Não foi possível persistir o estado local do estúdio de vídeo.");
      }
    });
    if (safeTenant && activeTask?.id) {
      if (remoteSaveTimerRef.current) window.clearTimeout(remoteSaveTimerRef.current);
      remoteSaveTimerRef.current = window.setTimeout(async () => {
        await supabase.from("studio_states").upsert({
          tenant_slug: safeTenant,
          task_id: activeTask.id,
          studio_type: "video",
          state: stateToSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_slug,task_id,studio_type" });
      }, 800);
    }
  }, [characters, config, generalIdea, finalPrompt, finalPromptEn, negativePrompt, ttsText, faceImage, bodyImage, productImage, clothingImage, styleImage, audioFile, selectedEngine, generatedResult, veoPromptJsonPt, finalPromptFormat, safeTenant, activeTask?.id, isStateLoaded]);

  useEffect(() => {
    if (!safeTenant || !activeTask?.id) return;
    supabase
      .from("approvals")
      .select("video_url, created_at")
      .eq("tenant_slug", safeTenant)
      .eq("task_id", activeTask.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const url = data?.[0]?.video_url;
        if (url) setGeneratedResult(url);
      });
  }, [safeTenant, activeTask?.id]);

  const handleSaveJobSnapshot = async (payload: any, name: string) => {
    const stripBase64 = (v: any) => (typeof v === "string" && v.startsWith("data:") ? null : v);
    const sanitizedPayload = {
      ...payload,
      generatedResult: stripBase64(payload.generatedResult),
      faceImage:       stripBase64(payload.faceImage),
      bodyImage:       stripBase64(payload.bodyImage),
      productImage:    stripBase64(payload.productImage),
      clothingImage:   stripBase64(payload.clothingImage),
      styleImage:      stripBase64(payload.styleImage),
    };
    const job = {
      id: Date.now(),
      name,
      date: new Date().toLocaleDateString("pt-BR"),
      taskId: activeTask?.id || null,
      tenant: safeTenant,
      payload: sanitizedPayload,
    };
    const updated = [job, ...savedJobs];
    setSavedJobs(updated);
    try {
      await localforage.setItem("iagencia_saved_video_jobs", updated);
    } catch {
      toast.error("Não foi possível salvar o job localmente.");
    }
  };

  const handleLoadJobSnapshot = (job: any) => {
    const p = job?.payload || {};
    if (p.characters) setCharacters(p.characters);
    if (p.config) setConfig(p.config);
    setGeneralIdea(p.generalIdea || "");
    setFinalPrompt(p.finalPrompt || "");
    setFinalPromptEn(p.finalPromptEn || "");
    setNegativePrompt(p.negativePrompt || "");
    setTtsText(p.ttsText || "");
    setFaceImage(p.faceImage || null);
    setBodyImage(p.bodyImage || null);
    setProductImage(p.productImage || null);
    setClothingImage(p.clothingImage || null);
    setStyleImage(p.styleImage || null);
    setAudioFile(p.audioFile || null);
    setSelectedEngine(p.selectedEngine || "kling");
    setVeoPromptJsonPt(p.veoPromptJsonPt || "");
    setFinalPromptFormat(p.finalPromptFormat || "text");
    setGeneratedResult(p.generatedResult || null);
    setShowLoadJobModal(false);
    toast.success(`Job "${job.name}" carregado!`);
  };

  const loadVersions = async () => {
    if (!safeTenant || !activeTask?.id) return;
    const { data } = await supabase
      .from("studio_state_versions")
      .select("id,label,created_at,state")
      .eq("tenant_slug", safeTenant)
      .eq("task_id", activeTask.id)
      .eq("studio_type", "video")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setVersions(data);
  };

  const loadVeoJsonVersions = async () => {
    if (!safeTenant || !activeTask?.id) return;
    const { data } = await supabase
      .from("studio_state_versions")
      .select("id,label,created_at,state")
      .eq("tenant_slug", safeTenant)
      .eq("task_id", activeTask.id)
      .eq("studio_type", "video_veo_json")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setVeoJsonVersions(data);
  };

  const handleSaveVeoJsonVersion = async () => {
    if (!safeTenant || !activeTask?.id) return toast.error("Selecione um job.");
    if (!veoPromptJsonPt.trim()) return toast.error("JSON vazio.");
    const { error } = await supabase.from("studio_state_versions").insert({
      tenant_slug: safeTenant,
      task_id: activeTask.id,
      studio_type: "video_veo_json",
      label: versionLabel || null,
      state: { veoPromptJsonPt },
    });
    if (error) return toast.error(error.message || "Erro ao salvar versão.");
    setVersionLabel("");
    await loadVeoJsonVersions();
    toast.success("Versão do JSON salva.");
  };

  const handleLoadVeoJsonVersion = (v: any) => {
    const s = v?.state || {};
    if (s.veoPromptJsonPt) {
      setVeoPromptJsonPt(s.veoPromptJsonPt);
      setFinalPromptFormat("json");
      setFinalPrompt(s.veoPromptJsonPt);
    }
    toast.success("JSON carregado.");
  };

  const handleSaveVersion = async () => {
    if (!safeTenant || !activeTask?.id) return toast.error("Selecione um job.");
    const stateToSave = {
      characters, config, generalIdea, finalPrompt, negativePrompt,
      ttsText, faceImage, bodyImage, productImage, clothingImage, styleImage,
      audioFile, selectedEngine, generatedResult, veoPromptJsonPt, finalPromptFormat,
    };
    const { error } = await supabase.from("studio_state_versions").insert({
      tenant_slug: safeTenant,
      task_id: activeTask.id,
      studio_type: "video",
      label: versionLabel || null,
      state: stateToSave,
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
    setGeneralIdea(s.generalIdea || "");
    setFinalPrompt(s.finalPrompt || "");
    setFinalPromptEn(s.finalPromptEn || "");
    setNegativePrompt(s.negativePrompt || "");
    setTtsText(s.ttsText || "");
    setFaceImage(s.faceImage || null);
    setBodyImage(s.bodyImage || null);
    setProductImage(s.productImage || null);
    setClothingImage(s.clothingImage || null);
    setStyleImage(s.styleImage || null);
    setAudioFile(s.audioFile || null);
    setSelectedEngine(s.selectedEngine || "kling");
    setFinalPromptFormat(s.finalPromptFormat || "text");
    setGeneratedResult(s.generatedResult || null);
    toast.success("Versão carregada.");
  };

  useEffect(() => {
    if (selectedEngine !== "veo" && finalPromptFormat !== "text") {
      setFinalPromptFormat("text");
    }
  }, [selectedEngine, finalPromptFormat]);

  useEffect(() => {
    if (!activeTask?.id) return;
    try {
      localStorage.setItem("video_studio_last_task_id", String(activeTask.id));
    } catch {
      // ignore
    }
  }, [activeTask?.id]);

  useEffect(() => {
    if (!tasks.length || activeTask) return;
    let lastId: number | null = null;
    try {
      const raw = localStorage.getItem("video_studio_last_task_id");
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) lastId = parsed;
      }
    } catch {
      // ignore
    }

    const byId = lastId ? tasks.find((t) => t.id === lastId) : null;
    if (byId) {
      setActiveTask(byId);
      return;
    }

    // fallback: último por id (mais recente)
    const latest = [...tasks].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
    if (latest) setActiveTask(latest);
  }, [tasks, activeTask]);

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel(`realtime:producao_tasks:${activeTenant || "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks", filter: "department=eq.producao" }, () => {
        fetchTasks();
        toast.info("Novo Job na Produção de Vídeo!");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks", filter: "department=eq.producao" }, () => {
        fetchTasks();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks", filter: "department=eq.producao" }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTenant]);

  const filteredTasks = useMemo(() => {
    if (!activeTenant || activeTenant === "all") return tasks;
    return tasks.filter((t) => t.tenant === activeTenant);
  }, [tasks, activeTenant]);

  const handleDrop = async (taskId: number, status: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await updateTaskStatus(taskId, status, editorName);
    await fetchTasks();
  };

  const handleDeleteTask = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
    if (activeTask?.id === id) setActiveTask(null);
    toast.success("Job removido.");
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

  const toggleFormat = (fmt: string) =>
    setNewTaskData((prev) => ({
      ...prev,
      formats: prev.formats.includes(fmt) ? prev.formats.filter((f) => f !== fmt) : [...prev.formats, fmt],
    }));

  const toggleAssignee = (personId: string) =>
    setNewTaskData((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(personId)
        ? prev.assignees.filter((id) => id !== personId)
        : [...prev.assignees, personId],
    }));

  const handleSaveTask = async () => {
    if (!newTaskData.title.trim()) return toast.error("O título é obrigatório.");
    if (!safeTenant) return toast.error("Selecione um cliente antes de criar um job.");
    const payload = {
      tenant: safeTenant,
      department: "producao",
      created_by: user?.id || null,
      updated_by: editorName,
      ...newTaskData,
    };
    if (editingTaskId) {
      await supabase.from("tasks").update(payload).eq("id", editingTaskId);
      toast.success("Tarefa atualizada!");
    } else {
      await supabase.from("tasks").insert([payload]);
      toast.success("Nova tarefa criada!");
    }
    fetchTasks();
    setShowTaskModal(false);
    setEditingTaskId(null);
  };

  // === FUNÇÕES DE ENVIO (CONFORME SOLICITADO) ===
  const handleSaveToLibrary = async (dataUrl: string) => {
    if (!activeTask?.id) return toast.error("Selecione um Job no Kanban antes de enviar.");
    if (!safeTenant) return toast.error("Selecione um cliente antes de enviar.");

    try {
      const finalVideoUrl = toAbsoluteMediaUrl(dataUrl);
      const { error } = await supabase.from("library").insert([
        {
          tenant_slug: safeTenant,
          url: finalVideoUrl,
          type: "video",
          task_id: activeTask.id,
          title: activeTask.title || "Vídeo",
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw new Error(error.message || "Erro ao salvar.");
      toast.success("Vídeo enviado para a Biblioteca!");
      await updateTaskStatus(activeTask.id, "review");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar na biblioteca.");
    }
  };

  const handleSaveToApproval = async (dataUrl: string) => {
    if (!activeTask?.id) return toast.error("Selecione um Job no Kanban antes de enviar.");
    if (!safeTenant) return toast.error("Selecione um cliente antes de enviar.");

    try {
      const finalVideoUrl = toAbsoluteMediaUrl(dataUrl);

      const { error } = await supabase.from("approvals").insert([
        {
          task_id: activeTask.id,
          tenant_slug: safeTenant,
          type: "video",
          video_url: finalVideoUrl,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw new Error(error.message || "Erro ao salvar aprovação.");

      await updateTaskStatus(activeTask.id, "review");

      setGeneratedResult(finalVideoUrl);
      setPendingJobPayload({
        characters,
        config,
        generalIdea,
        finalPrompt,
        negativePrompt,
        ttsText,
        faceImage,
        bodyImage,
        productImage,
        clothingImage,
        styleImage,
        audioFile,
        generatedResult: finalVideoUrl,
        selectedEngine,
        veoPromptJsonPt,
        finalPromptFormat,
      });
      setJobNameInput(activeTask.title || "Job de Vídeo");
      setShowSaveJobModal(true);
      toast.success("Vídeo enviado para aprovação!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar para aprovação.");
    }
  };

  const handleDownloadVideo = async (url: string, name?: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Não foi possível baixar o vídeo.");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const safeName = (name || "video")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      a.download = `${safeName || "video"}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success("Download iniciado.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao baixar o vídeo.");
    }
  };

  const handleUploadRef = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setter(dataUrl);
      toast.success("Frame de referência carregado!");
    } catch {
      toast.error("Falha ao carregar o frame.");
    } finally {
      e.target.value = "";
    }
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setAudioFile(dataUrl);
      toast.success("Áudio carregado para o VEO!");
    } catch {
      toast.error("Falha ao carregar o áudio.");
    } finally {
      e.target.value = "";
    }
  };

  // === MONTAGEM DO PROMPT TÉCNICO ===
  const handleEnhancePrompt = async () => {
    if (!generalIdea.trim()) return toast.warning("Descreva o cenário/atmosfera primeiro.");
    setIsThinking(true);
    await new Promise((r) => setTimeout(r, 350));

    // Map CastingForm fields to the generic character shape expected by buildVideoPrompt
    const mappedChars = characters.map((c: any) => ({
      name: c.name || "",
      physical_details: [
        c.age ? `${c.age} years old` : "",
        c.ethnicity || "",
        c.gender || "",
        c.body ? `${c.body} body` : "",
        c.hair ? `${c.hair} hair` : "",
        c.eyes ? `${c.eyes} eyes` : "",
        c.gender === "Homem" ? formatBeardTrait(c.beard || "") : "",
      ].filter(Boolean).join(", "),
      clothing_details: c.clothing || "",
      expression: c.expression || "",
      action: c.action || "",
    }));

    const promptParams = { generalIdea, characters: mappedChars, config, negativePrompt };
    const builtEn = buildVideoPrompt(selectedEngine, promptParams);
    const builtPt = buildVideoPromptPt(selectedEngine, promptParams);

    setFinalPromptEn(builtEn); // enviado à API (inglês técnico)

    // Veo JSON goes into its own state; all others go to finalPrompt (PT)
    if (selectedEngine === "veo" && finalPromptFormat === "json") {
      setVeoPromptJsonPt(builtPt);
    } else {
      setFinalPrompt(builtPt); // exibido ao usuário (português)
    }

    setIsThinking(false);
    const platform = VIDEO_PLATFORMS.find(p => p.id === selectedEngine);
    toast.success(`Prompt montado para ${platform?.label || selectedEngine}!`);
  };

  const handleGenerate = async () => {
    // Send the English prompt to the API; fall back to rebuilding from params if needed
    const scriptToSend = (finalPromptEn || finalPrompt || generalIdea || "").trim();
    const scriptPt = scriptToSend;
    const veoJsonFromFinal = finalPromptFormat === "json" ? (veoPromptJsonPt || finalPromptEn || finalPrompt).trim() : "";
    if (!scriptPt && !(selectedEngine === "veo" && veoJsonFromFinal)) {
      return toast.warning("Escreva o roteiro em português antes de gerar.");
    }
    if (selectedEngine === "veo") {
    if (!config.location.trim()) return toast.warning("No VEO, defina a Locação para evitar surpresas.");
    if (!config.time_of_day) return toast.warning("No VEO, selecione o Horário.");
    if (!config.tone) return toast.warning("No VEO, selecione o Tom.");
    if (!config.color_grade) return toast.warning("No VEO, selecione o Color Grade.");
}

  setIsGenerating(true);
  setGeneratedResult(null);

  try {
  const VIDEO_ENGINE_MAP: Record<string, string> = {
    kling: "kling",
    veo: "veo",
    runway: "runway",
    sora: "sora",
  };
  const resolvedEngine = VIDEO_ENGINE_MAP[selectedEngine] ?? selectedEngine;

  const refinerData = {
  script_pt: scriptPt,
  engine: resolvedEngine,
  config: {
    ...config,
    // redundância útil: garante que o refiner receba sempre
    location: config.location,
    time_of_day: config.time_of_day,
    color_grade: config.color_grade,
    tone: config.tone,
    environment: config.environment,
  },
  has_ref: Boolean(faceImage || bodyImage || productImage || clothingImage || styleImage),
  refs: {
    img1_face: faceImage,
    img2_body: bodyImage,
    img3_product: productImage,
    img4_clothing: clothingImage,
    img5_style: styleImage,
  },
  tts_text: selectedEngine === "veo" ? ttsText : "",
  audio_url: selectedEngine === "veo" ? audioFile : null,
  negative_prompt: negativePrompt,
};

  const res = await fetch(`${API_BASE}${GENERATE_ENDPOINT}`, {
    method: "POST",
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      tenant_slug: safeTenant,
      engine: resolvedEngine,
      refiner_data: {
        ...refinerData,
        ...(resolvedEngine === "veo" && veoJsonFromFinal ? { veo_prompt_pt_json: veoJsonFromFinal } : {}),
      },
  }),
});

    if (!res.ok) throw new Error("Erro no servidor");

    const data = await res.json();
    const rawUrl = data?.url || data?.video_url || null;
    if (!rawUrl || typeof rawUrl !== "string") {
      throw new Error(data?.detail || "Backend não retornou URL do vídeo.");
    }
    const finalUrl = toAbsoluteMediaUrl(rawUrl);
    setGeneratedResult(finalUrl);
    toast.success("Vídeo renderizado!");
  } catch (err: any) {
    toast.error(err?.message || "Falha na renderização.");
  } finally {
    setIsGenerating(false);
  }
};

  return (
    <div className="flex flex-col w-full h-full min-h-screen bg-black text-zinc-100 overflow-hidden font-sans relative">
      {/* 1. HEADER */}
      <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 shrink-0 bg-black z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-900/30 rounded-lg">
            <Film className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-tighter">Estúdio de Vídeo</h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsScriptExpanded(!isScriptExpanded)}
            className="text-[10px] flex items-center gap-2 text-red-400 hover:text-green-400 transition uppercase font-black"
          >
            {isScriptExpanded ? "Ocultar Roteiro" : "Ver Roteiro"} <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsKanbanExpanded(!isKanbanExpanded)}
            className="text-xs flex items-center gap-2 text-zinc-200 bg-red-600 px-3 py-1.5 rounded border border-red-800 hover:bg-red-500 transition font-bold uppercase"
          >
            <Layout className="w-4 h-4" /> {isKanbanExpanded ? "Recolher Pauta" : "Ver Pauta"}
          </button>
        </div>
      </header>

      {/* 2. KANBAN */}
      <div className="shrink-0 z-30">
        <KanbanBoard
          isExpanded={isKanbanExpanded}
          onToggleExpand={() => setIsKanbanExpanded(!isKanbanExpanded)}
          tasks={filteredTasks}
          activeTask={activeTask}
          onTaskSelect={(t) => setActiveTask(t)}
          onTaskDelete={handleDeleteTask}
          onTaskDrop={handleDrop}
          onTaskEdit={handleOpenEditTask}
          onNewTaskClick={(status) => {
            setNewTaskData({ title: "", description: "", formats: [], status, assignees: [] });
            setEditingTaskId(null);
            setShowTaskModal(true);
          }}
        />
      </div>

      {/* 3. CORPO DO ESTÚDIO (3 COLUNAS) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* COLUNA ESQUERDA */}
        <aside className="w-[420px] bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 overflow-y-auto scrollbar-thin p-5 space-y-8">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40 rounded-xl">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Meus Setups
            </span>
            <div className="flex gap-2">
              <button onClick={() => setShowLoadJobModal(true)} className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700" title="Jobs Salvos">
                <FolderOpen className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">
                <Eraser className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700">
                <Save className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* REFERÊNCIAS VISUAIS */}
          <div className="border-b border-zinc-800 bg-zinc-950/80">
            <button
              onClick={() => setIsRefsOpen(!isRefsOpen)}
              className="w-full flex justify-between items-center p-4 text-xs font-black text-blue-400 uppercase hover:bg-zinc-900/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Frames de Referência
              </span>
              {isRefsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isRefsOpen && (
              <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={() => {
                      setFaceImage(null);
                      setBodyImage(null);
                      setProductImage(null);
                      setClothingImage(null);
                      setStyleImage(null);
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-red-300 hover:text-white bg-red-950/40 border border-red-900/60 hover:bg-red-700/60 px-3 py-1 rounded-full transition-colors"
                  >
                    Limpar todos
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                {/* @img1 */}
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl h-24 flex flex-col items-center justify-center relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => handleUploadRef(e, setFaceImage)}
                  />
                  {faceImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setFaceImage(null); }}
                      className="absolute top-1 right-1 z-20 bg-black/70 text-red-300 hover:text-red-100 hover:bg-red-600/80 rounded p-1 transition"
                      title="Excluir referência"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {faceImage ? (
                    <img src={faceImage} alt="img1 face" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-zinc-700" />
                  )}
                  <span className="text-[8px] font-black text-zinc-500 mt-1 uppercase">@img1 Face</span>
                </div>

                {/* @img2 */}
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl h-24 flex flex-col items-center justify-center relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => handleUploadRef(e, setBodyImage)}
                  />
                  {bodyImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBodyImage(null); }}
                      className="absolute top-1 right-1 z-20 bg-black/70 text-red-300 hover:text-red-100 hover:bg-red-600/80 rounded p-1 transition"
                      title="Excluir referência"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {bodyImage ? (
                    <img src={bodyImage} alt="img2 body" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-zinc-700" />
                  )}
                  <span className="text-[8px] font-black text-zinc-500 mt-1 uppercase">@img2 Body</span>
                </div>

                {/* @img3 */}
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl h-24 flex flex-col items-center justify-center relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => handleUploadRef(e, setProductImage)}
                  />
                  {productImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setProductImage(null); }}
                      className="absolute top-1 right-1 z-20 bg-black/70 text-red-300 hover:text-red-100 hover:bg-red-600/80 rounded p-1 transition"
                      title="Excluir referência"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {productImage ? (
                    <img src={productImage} alt="img3 product" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-zinc-700" />
                  )}
                  <span className="text-[8px] font-black text-zinc-500 mt-1 uppercase">@img3 Produto</span>
                </div>

                {/* @img4 */}
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl h-24 flex flex-col items-center justify-center relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => handleUploadRef(e, setClothingImage)}
                  />
                  {clothingImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setClothingImage(null); }}
                      className="absolute top-1 right-1 z-20 bg-black/70 text-red-300 hover:text-red-100 hover:bg-red-600/80 rounded p-1 transition"
                      title="Excluir referência"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {clothingImage ? (
                    <img src={clothingImage} alt="img4 clothing" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-zinc-700" />
                  )}
                  <span className="text-[8px] font-black text-zinc-500 mt-1 uppercase">@img4 Roupa</span>
                </div>

                {/* @img5 */}
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl h-24 flex flex-col items-center justify-center relative overflow-hidden group">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => handleUploadRef(e, setStyleImage)}
                  />
                  {styleImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStyleImage(null); }}
                      className="absolute top-1 right-1 z-20 bg-black/70 text-red-300 hover:text-red-100 hover:bg-red-600/80 rounded p-1 transition"
                      title="Excluir referência"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {styleImage ? (
                    <img src={styleImage} alt="img5 style" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-zinc-700" />
                  )}
                  <span className="text-[8px] font-black text-zinc-500 mt-1 uppercase">@img5 Style</span>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* ESCOLHA A PLATAFORMA */}
          <div className="p-5 space-y-4 border-b border-zinc-900 bg-black/20">
            <PlatformSelector
              type="video"
              value={selectedEngine}
              onChange={setSelectedEngine}
              tenantSlug={safeTenant}
            />

            {/* LOCUÇÃO + ÁUDIO (SÓ VEO) */}
            {selectedEngine === "veo" && finalPromptFormat !== "json" && (
              <section className="space-y-3 pt-4 border-t border-cyan-900/30 animate-in slide-in-from-left-4">
                <label className="text-[10px] font-black text-cyan-500 uppercase flex items-center gap-2">
                  <Mic className="w-3 h-3" /> Texto de Locução (VEO)
                </label>
                <Textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="bg-black border-cyan-900/30 text-xs h-24 focus:border-cyan-500 outline-none p-3"
                  placeholder="O que o personagem deve falar?"
                />

                <div className="pt-2 space-y-2">
                  <label className="text-[10px] font-black text-cyan-500 uppercase flex items-center gap-2">
                    <Music className="w-3 h-3" /> Upload de Áudio (VEO)
                  </label>

                  <div className="relative">
                    <input
                      type="file"
                      accept="audio/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleUploadAudio}
                    />
                    <div className="h-10 rounded-xl border border-cyan-900/30 bg-black flex items-center justify-between px-3">
                      <span className="text-[10px] text-zinc-400">
                        {audioFile ? "Áudio carregado ✅" : "Clique para enviar um áudio (mp3/wav/m4a)"}
                      </span>
                      <Upload className="w-4 h-4 text-cyan-500" />
                    </div>
                  </div>

                  {audioFile && (
                    <audio controls src={audioFile} className="w-full h-10" />
                  )}
                </div>

                <div className="flex items-center justify-between">
      <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
        Parâmetros VEO
      </label>
      <span className="text-[10px] text-zinc-500">
        Para garantir a precisão da cena
      </span>
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-bold text-zinc-500">
        Locação (obrigatório)
      </label>
      <input
        value={config.location}
        onChange={(e) => setConfig({ ...config, location: e.target.value })}
        className="w-full bg-black border border-cyan-900/30 rounded-xl p-2 text-xs text-zinc-200 focus:border-cyan-500 outline-none"
        placeholder='Ex.: Parque Ibirapuera, São Paulo'
      />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[10px] font-bold text-zinc-500">
          Horário (obrigatório)
        </label>
        <select
          className="w-full bg-black border border-cyan-900/30 rounded p-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
          value={config.time_of_day}
          onChange={(e) => setConfig({ ...config, time_of_day: e.target.value })}
        >
          {CONSTANTS.TIME_OF_DAY.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold text-zinc-500">
          Tom (obrigatório)
        </label>
        <select
          className="w-full bg-black border border-cyan-900/30 rounded p-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
          value={config.tone}
          onChange={(e) => setConfig({ ...config, tone: e.target.value })}
        >
          {CONSTANTS.TONE.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="col-span-2">
        <label className="text-[10px] font-bold text-zinc-500">
          Paleta de Cores (obrigatório)
        </label>
        <select
          className="w-full bg-black border border-cyan-900/30 rounded p-1.5 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
          value={config.color_grade}
          onChange={(e) => setConfig({ ...config, color_grade: e.target.value })}
        >
          {CONSTANTS.COLOR_GRADE.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-[10px] font-bold text-zinc-500">
        Ambiente (opcional, mas recomendado)
      </label>
      <input
        value={config.environment}
        onChange={(e) => setConfig({ ...config, environment: e.target.value })}
        className="w-full bg-black border border-cyan-900/30 rounded-xl p-2 text-xs text-zinc-200 focus:border-cyan-500 outline-none"
        placeholder="Ex.: árvores, gramado, pessoas caminhando ao fundo"
      />
    </div>
              </section>
            )}

            {/* JSON agora usa a mesma caixa do Prompt Final Editável */}
          </div>

          <CastingForm characters={characters} setCharacters={setCharacters} />

          {/* CAMPOS */}
          <div className="p-5 space-y-6">
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase block mb-2 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Cenário e Movimento
              </label>
              <textarea
                className="w-full bg-white border border-zinc-300 rounded-xl p-3 text-sm text-black h-32 focus:border-red-500 outline-none shadow-inner"
                placeholder="Descreva o cenário, o que o personagem faz e como se move..."
                value={generalIdea}
                onChange={(e) => setGeneralIdea(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500">Formato</label>
                <select
                  className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-300"
                  value={config.format}
                  onChange={(e) => setConfig({ ...config, format: e.target.value })}
                >
                  {CONSTANTS.FORMATOS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500">Ritmo</label>
                <select
                  className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-300"
                  value={config.pacing}
                  onChange={(e) => setConfig({ ...config, pacing: e.target.value })}
                >
                  {CONSTANTS.RITMO.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500">Lente/Câmera</label>
                <select
                  className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-300"
                  value={config.camera}
                  onChange={(e) => setConfig({ ...config, camera: e.target.value })}
                >
                  {CONSTANTS.CAMERA.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500">Estilo</label>
                <select
                  className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-300"
                  value={config.style}
                  onChange={(e) => setConfig({ ...config, style: e.target.value })}
                >
                  {CONSTANTS.ESTILOS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Negative Prompt</label>
              <textarea
                className="w-full bg-black rounded-xl p-3 text-xs font-medium border border-zinc-800 text-zinc-200 h-20 shadow-inner focus:border-red-500 outline-none"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
            </div>

            <div>
            <label className="text-[10px] font-bold text-zinc-500">Movimento de Câmera</label>
            <select
              className="w-full bg-black border border-zinc-800 rounded p-1.5 text-xs text-zinc-300"
              value={config.movement}
              onChange={(e) => setConfig({ ...config, movement: e.target.value })}
            >
              {CONSTANTS.MOVIMENTO.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

            <Button
              onClick={handleEnhancePrompt}
              disabled={isThinking}
              className="w-full text-xs h-10 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300"
            >
              {isThinking ? (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-3 h-3 mr-2" />
              )}
              Montar Prompt Técnico
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Prompt Final Editável <span className="normal-case font-normal text-zinc-600">(PT · traduzido ao enviar)</span></label>
                {selectedEngine === "veo" && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded p-1">
                      <button
                        type="button"
                        onClick={() => setFinalPromptFormat("text")}
                        className={`text-[10px] px-2 py-1 rounded ${finalPromptFormat === "text" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinalPromptFormat("json")}
                        className={`text-[10px] px-2 py-1 rounded ${finalPromptFormat === "json" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                      >
                        JSON
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={async () => {
                          if (!safeTenant) return toast.error("Selecione um cliente.");
                          const baseScriptPt = finalPromptFormat === "text"
                            ? (finalPrompt || generalIdea || "").trim()
                            : (generalIdea || "").trim();
                          const refinerData = {
                            script_pt: baseScriptPt,
                            engine: "veo",
                            config: {
                              ...config,
                              location: config.location,
                              time_of_day: config.time_of_day,
                              color_grade: config.color_grade,
                              tone: config.tone,
                              environment: config.environment,
                            },
                            has_ref: Boolean(faceImage || bodyImage || productImage || clothingImage || styleImage),
                            refs: {
                              img1_face: faceImage,
                              img2_body: bodyImage,
                              img3_product: productImage,
                              img4_clothing: clothingImage,
                              img5_style: styleImage,
                            },
                            tts_text: ttsText,
                            audio_url: audioFile,
                            negative_prompt: negativePrompt,
                          };
                          try {
                            const res = await fetch(`${API_BASE}${GENERATE_ENDPOINT}`, {
                              method: "POST",
                              headers: await getAuthHeaders({ "Content-Type": "application/json" }),
                              body: JSON.stringify({
                                tenant_slug: safeTenant,
                                engine: "veo",
                                refiner_data: refinerData,
                                preview_veo_json: true,
                              }),
                            });
                            if (!res.ok) throw new Error("Falha ao gerar JSON");
                            const data = await res.json();
                            const nextJson = data?.prompt_pt_json || "";
                            setVeoPromptJsonPt(nextJson);
                            setFinalPromptFormat("json");
                            setFinalPrompt(nextJson);
                            toast.success("JSON (PT) gerado.");
                          } catch (e: any) {
                            toast.error(e?.message || "Erro ao gerar JSON (PT).");
                          }
                        }}
                        className="text-[10px] h-7 px-2 bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                      >
                        Gerar JSON
                      </Button>
                      <Button
                        onClick={async () => {
                          await loadVeoJsonVersions();
                          setShowVeoJsonHistory(true);
                        }}
                        className="text-[10px] h-7 px-2 bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                      >
                        Histórico
                      </Button>
                      <Button
                        onClick={handleSaveVeoJsonVersion}
                        className="text-[10px] h-7 px-2 bg-emerald-600 hover:bg-emerald-500"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <textarea
                className="w-full bg-white rounded-xl p-3 text-xs font-medium border border-zinc-300 text-black h-28 shadow-inner focus:border-red-500 outline-none"
                value={finalPromptFormat === "json" ? veoPromptJsonPt : finalPrompt}
                onChange={(e) => {
                  if (finalPromptFormat === "json") {
                    setVeoPromptJsonPt(e.target.value);
                    setFinalPrompt(e.target.value);
                  } else {
                    setFinalPrompt(e.target.value);
                  }
                }}
                placeholder={finalPromptFormat === "json" ? "Cole ou gere o JSON (PT) aqui." : undefined}
              />
              {selectedEngine === "veo" && finalPromptFormat === "json" && (
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-zinc-500">Este JSON será traduzido para EN e enviado ao VEO.</p>
                  <Button
                    onClick={() => setFinalPromptFormat("text")}
                    className="text-[10px] h-7 px-2 bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                  >
                    Voltar para Texto
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={async () => { await loadVersions(); setShowVersionModal(true); }} className="text-xs h-8 bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700">
                Histórico de Versões
              </Button>
              <input
                className="bg-black border border-zinc-700 text-white text-xs h-8 rounded px-2 w-full"
                placeholder="Nome da versão (opcional)"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
              <Button onClick={handleSaveVersion} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500">
                Salvar Versão
              </Button>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (finalPromptFormat === "json" && selectedEngine === "veo" ? !veoPromptJsonPt : !finalPrompt)}
              className="w-full h-14 rounded-2xl font-black shadow-lg bg-gradient-to-r from-red-600 to-red-800 text-white uppercase tracking-tighter text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Gerando Vídeo.
                </>
              ) : (
                "Gerar Vídeo"
              )}
            </Button>
          </div>
        </aside>

        {/* COLUNA CENTRAL */}
        <main className="flex-1 bg-[#050505] flex flex-col items-center justify-start p-10 relative overflow-auto">
          <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-full flex items-center justify-center gap-3 shadow-2xl mx-auto w-fit mb-6">
            <button
              onClick={() => generatedResult && handleSaveToApproval(generatedResult)}
              disabled={!generatedResult}
              className={`px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-2 uppercase tracking-widest transition-all ${
                generatedResult
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Send className="w-3 h-3" /> Enviar para Aprovação
            </button>
            <button
              onClick={() => generatedResult && handleDownloadVideo(generatedResult, activeTask?.title)}
              disabled={!generatedResult}
              className={`px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-2 uppercase tracking-widest transition-all ${
                generatedResult
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Download className="w-3 h-3" /> Baixar Vídeo
            </button>
            <button
              onClick={() => generatedResult && handleSaveToLibrary(generatedResult)}
              disabled={!generatedResult}
              className={`px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-2 uppercase tracking-widest transition-all ${
                generatedResult
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Library className="w-3 h-3" /> Biblioteca
            </button>
          </div>
          {generatedResult ? (
            <div className="w-full max-w-4xl space-y-6 animate-in zoom-in-95 duration-500">
              <video
                src={generatedResult}
                controls
                autoPlay
                loop
                className="w-full rounded-3xl border border-zinc-800 shadow-2xl"
              />
            </div>
          ) : (
            <div className="text-center opacity-20">
              <MonitorPlay className="w-24 h-24 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest italic">
                Aguardando Direção Técnica do Danilo
              </p>
            </div>
          )}
        </main>

        {/* COLUNA DIREITA: GUIA DE ROTEIRO (RETRÁTIL - FIX) */}
        <aside
          className={[
            "transition-all duration-500 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden shrink-0",
            isScriptExpanded ? "w-[320px] opacity-100" : "w-0 opacity-0 border-none pointer-events-none",
          ].join(" ")}
        >
          {/* sem width fixo aqui */}
          <div className="w-full p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-4 h-4 text-red-500" />
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Guia de Roteiro
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {stripHtml(activeTask?.description || "") ? (
                <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-[9px] font-black text-zinc-600 block mb-2 uppercase">
                    Roteiro da Redação
                  </span>
                  <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {stripHtml(activeTask?.description || "")}
                  </p>
                </div>
              ) : null}
              {activeTask?.briefing_data?.scenes?.map((scene: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setGeneralIdea(scene.visual_prompt)}
                  className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 hover:border-red-500 cursor-pointer transition-all"
                >
                  <span className="text-[9px] font-black text-zinc-600 block mb-2 uppercase">
                    Cena #{scene.number}
                  </span>
                  <p className="text-[11px] text-zinc-300 italic leading-relaxed">
                    "{scene.visual_prompt}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[500px] shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-bold text-lg">{editingTaskId ? "Editar Job" : "Novo Job de Vídeo"}</h2>
              <button onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }} className="text-zinc-500 hover:text-white">
                x
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Título do Job</label>
                <input
                  className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 focus:outline-none focus:border-red-500"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Briefing</label>
                <textarea
                  className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 h-24 resize-none focus:outline-none focus:border-red-500"
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Formatos</label>
                <div className="flex flex-wrap gap-2">
                  {TASK_FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => toggleFormat(f)}
                      className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${
                        newTaskData.formats.includes(f) ? "bg-red-600 border-red-500 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Responsável</label>
                <div className="flex gap-2">
                  {EQUIPE.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        newTaskData.assignees.includes(m.id) ? "bg-red-600 border-red-500 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                Cancelar
              </Button>
              <Button onClick={handleSaveTask} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">
                {editingTaskId ? "Salvar Alterações" : "Criar Job"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSaveJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[420px] shadow-2xl">
            <h2 className="text-white font-bold text-lg">Salvar Job</h2>
            <div className="mt-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do Job</label>
              <input
                className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white mt-1 focus:outline-none focus:border-red-500"
                placeholder="Ex: Comercial Cliente X"
                value={jobNameInput}
                onChange={(e) => setJobNameInput(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => { setShowSaveJobModal(false); setPendingJobPayload(null); setJobNameInput(""); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                Cancelar
              </Button>
              <Button onClick={async () => { const name = jobNameInput.trim(); if (!name || !pendingJobPayload) return toast.error("Dados inválidos"); await handleSaveJobSnapshot(pendingJobPayload, name); setShowSaveJobModal(false); setPendingJobPayload(null); setJobNameInput(""); toast.success("Job salvo!"); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {showLoadJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[480px] shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-bold text-lg">Jobs Salvos</h2>
              <button onClick={() => setShowLoadJobModal(false)} className="text-zinc-500 hover:text-white">
                x
              </button>
            </div>
            {savedJobs.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhum job salvo ainda.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {savedJobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                    <div>
                      <p className="text-white text-sm font-semibold">{job.name}</p>
                      <p className="text-zinc-500 text-[10px]">{job.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleLoadJobSnapshot(job)} className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3">Abrir</Button>
                      <Button onClick={async () => { const ud = savedJobs.filter((j) => j.id !== job.id); setSavedJobs(ud); await localforage.setItem("iagencia_saved_video_jobs", ud); }} className="bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white text-xs h-8 px-3 border border-red-800">Apagar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[520px] shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-bold text-lg">Histórico de Versões</h2>
              <button onClick={() => setShowVersionModal(false)} className="text-zinc-500 hover:text-white">
                x
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
                      <Button onClick={() => handleLoadVersion(v)} className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3">Abrir</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showVeoJsonHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[520px] shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-bold text-lg">Histórico JSON VEO (PT)</h2>
              <button onClick={() => setShowVeoJsonHistory(false)} className="text-zinc-500 hover:text-white">
                x
              </button>
            </div>
            {veoJsonVersions.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhuma versão salva.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {veoJsonVersions.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                    <div>
                      <p className="text-white text-sm font-semibold">{v.label || "Versão sem nome"}</p>
                      <p className="text-zinc-500 text-[10px]">{new Date(v.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleLoadVeoJsonVersion(v)} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-8 px-3">Abrir</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

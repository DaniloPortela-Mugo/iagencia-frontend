import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Type,
  Upload,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Trash2,
  Crop,
  Group,
  Ungroup,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Smartphone,
  Instagram,
  Box,
  Monitor,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Droplet,
  Save,
  Loader2,
  Download,
  Send,
  Library,
  LayoutTemplate,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import html2canvas from "html2canvas";

// -------------------- TIPAGEM --------------------
type StrokeStyle = "solid" | "dashed" | "dotted";

interface ShapeStyle {
  strokeWidth: number;
  strokeStyle: StrokeStyle;
}

interface CropState {
  zoom: number;
  x: number;
  y: number;
}

interface TextStyle {
  font: string;
  size: number;
  align: "left" | "center" | "right";
  color: string;
}

interface EditorElement {
  id: string;
  groupId?: string;
  type: "image" | "text" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity?: number;
  src?: string;
  crop?: CropState;
  content?: string;
  style?: TextStyle;
  shape?: "rect" | "circle" | "line" | "arrow";
  color?: string;
  shapeStyle?: ShapeStyle;
  lockedRatio: boolean;
  lineWeight?: number;
  lineStyle?: string;
}

interface DraftPayload {
  elements: EditorElement[];
  bgColor: string;
  canvasFormatId: string;
  editorOverlay?: string | null;
  customFonts?: { name: string }[];
}

interface StudioEditorProps {
  baseImage: string;
  onClose: () => void;

  onSaveToLibrary?: (url: string) => void;
  onSaveToApproval?: (url: string, draft?: DraftPayload) => void;

  // só quando usuário clicar “Salvar projeto editável” (se você ainda quiser isso)
  onSaveDraft?: (draft: DraftPayload) => void;

  initialDraft?: DraftPayload | null;
  autosaveKey?: string;

  // ✅ autosave silencioso (sem modal)
  onAutoSaveDraft?: (draft: DraftPayload) => void;

  // ✅ preview renderizado automático
  onAutoSaveRender?: (dataUrl: string) => void;
}

const normalizeElements = (els: EditorElement[]) => {
  const base = els.find((e) => e.id === "base-img");
  const rest = els.filter((e) => e.id !== "base-img");
  return base ? [base, ...rest] : els;
};

// -------------------- CONSTANTES --------------------
const FONTS = [
  { name: "Inter" },
  { name: "Montserrat" },
  { name: "Playfair Display" },
  { name: "Roboto" },
  { name: "Bebas Neue" },
];

const MOCKUP_TEMPLATES = [
  { id: "ig_feed", name: "Instagram Feed (4:5)", aspect: "4:5" },
  { id: "ig_story", name: "Story / Reels (9:16)", aspect: "9:16" },
  { id: "post_square", name: "Post Quadrado (1:1)", aspect: "1:1" },
  { id: "linkedin_x", name: "LinkedIn / X (16:9)", aspect: "16:9" },
];

const CANVAS_FORMATS = [
  { id: "story", label: "Story (9:16)", aspect: "9/16", icon: Smartphone },
  { id: "feed", label: "Feed (4:5)", aspect: "4/5", icon: Instagram },
  { id: "square", label: "Post (1:1)", aspect: "1/1", icon: Box },
  { id: "landscape", label: "Wide (16:9)", aspect: "16/9", icon: Monitor },
] as const;

type CanvasFormat = (typeof CANVAS_FORMATS)[number];

const DEFAULT_SHAPE_STYLE: ShapeStyle = { strokeWidth: 3, strokeStyle: "solid" };
const DEFAULT_CROP: CropState = { zoom: 100, x: 50, y: 50 };

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export default function StudioEditor({
  baseImage,
  onClose,
  onSaveToLibrary,
  onSaveToApproval,
  onSaveDraft,
  initialDraft,
  autosaveKey,
  onAutoSaveDraft,
  onAutoSaveRender,
}: StudioEditorProps) {
  // =========================
  // FONT LOADER
  // =========================
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Roboto:wght@400;700;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // =========================
  // HELPERS (precisam existir antes dos effects que usam)
  // =========================
  const isHttpUrl = (s?: string) =>
    typeof s === "string" && /^https?:\/\//i.test(s);

  const urlToDataUrl = async (url: string): Promise<string> => {
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // =========================
  // STATES BÁSICOS
  // =========================
  const [editorOverlay, setEditorOverlay] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bgColor, setBgColor] = useState(initialDraft?.bgColor ?? "#ffffff");

  const [canvasFormat, setCanvasFormat] = useState<CanvasFormat>(() => {
    const fromDraft = initialDraft?.canvasFormatId
      ? CANVAS_FORMATS.find((f) => f.id === initialDraft.canvasFormatId)
      : null;
    return fromDraft ?? CANVAS_FORMATS[1];
  });

  const [interactionMode, setInteractionMode] = useState<
    "none" | "move" | "resize" | "pan_crop"
  >("none");
  const [isCropping, setIsCropping] = useState(false);
  const isInteractingRef = useRef(false);
  const rafMoveRef = useRef<number | null>(null);
  const latestMoveRef = useRef<{ x: number; y: number } | null>(null);

  const [customFonts, setCustomFonts] = useState<{ name: string }[]>([]);
  const allFonts = [...FONTS, ...customFonts];

  // base em dataURL (para evitar CORS / perder imagem ao export)
  const [baseImageDataUrl, setBaseImageDataUrl] = useState<string | null>(null);

  // =========================
  // ELEMENTS (precisam vir ANTES de qualquer uso de elementsRef / setElements)
  // =========================
  const [elements, setElements] = useState<EditorElement[]>(
    initialDraft?.elements ?? [
      {
        id: "base-img",
        type: "image",
        src: baseImage, // depois o effect troca para baseImageDataUrl (quando existir)
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        lockedRatio: true,
        crop: { ...DEFAULT_CROP },
      },
    ]
  );

  const initialDraftAppliedRef = useRef(false);
  const selectedIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!initialDraft || initialDraftAppliedRef.current) return;

    if (Array.isArray(initialDraft.elements) && initialDraft.elements.length > 0) {
      setElements(normalizeElements(initialDraft.elements));
    }
    if (typeof initialDraft.bgColor === "string") {
      setBgColor(initialDraft.bgColor);
    }
    if (typeof initialDraft.editorOverlay !== "undefined") {
      setEditorOverlay(initialDraft.editorOverlay ?? null);
    }
    if (Array.isArray(initialDraft.customFonts)) {
      setCustomFonts(initialDraft.customFonts);
    }
    if (typeof initialDraft.canvasFormatId === "string") {
      const fmt = CANVAS_FORMATS.find((f) => f.id === initialDraft.canvasFormatId);
      if (fmt) setCanvasFormat(fmt);
    }

    const snap = structuredClone(
      normalizeElements(
        (initialDraft.elements as EditorElement[] | undefined) ?? elementsRef.current
      )
    );
    historyRef.current = [snap];
    historyStepRef.current = 0;
    setHistory([snap]);
    setHistoryStep(0);
    setSelectedIds([]);

    initialDraftAppliedRef.current = true;
  }, [initialDraft]);

  // Ref sempre atualizado (pra pointerUp/close não pegarem estado antigo)
  const elementsRef = useRef<EditorElement[]>(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // =========================
  // DERIVADOS (precisam vir depois de elements/selectedIds)
  // =========================
  const firstSelected = useMemo(() => {
    return elements.find((e) => e.id === selectedIds[0]) ?? null;
  }, [elements, selectedIds]);

  const isMultiSelect = selectedIds.length > 1;
  const isGroup = !!firstSelected?.groupId && !isMultiSelect;

  // =========================
  // REFS DE CANVAS / DRAG
  // =========================
  const canvasRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const elementsStart = useRef<
    Record<string, { x: number; y: number; w: number; h: number; fontSize: number }>
  >({});

  // =========================
  // CONVERTE baseImage (URL) -> dataURL (evita CORS + "ícone" quebrado)
  // =========================
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!baseImage) {
        setBaseImageDataUrl(null);
        return;
      }

      // se já é dataURL, mantém
      if (!isHttpUrl(baseImage)) {
        setBaseImageDataUrl(baseImage);
        return;
      }

      try {
        const b64 = await urlToDataUrl(baseImage);
        if (!cancelled) setBaseImageDataUrl(b64);
      } catch {
        // fallback: mantém URL original se falhar
        if (!cancelled) setBaseImageDataUrl(baseImage);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [baseImage]);

  // quando baseImageDataUrl mudar, atualiza a camada base-img
  useEffect(() => {
    if (!baseImageDataUrl) return;

    setElements((prev) =>
      prev.map((el) =>
        el.id === "base-img" && el.type === "image"
          ? { ...el, src: baseImageDataUrl }
          : el
      )
    );
  }, [baseImageDataUrl]);

  // =========================
  // SISTEMA DE HISTÓRICO (UNDO/REDO) - ROBUSTO
  // =========================
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  const historyRef = useRef<EditorElement[][]>([]);
  const historyStepRef = useRef<number>(0);
  const isTimeTravelRef = useRef(false);
  const historyDebounceRef = useRef<number | null>(null);

  const commitHistory = (nextElements: EditorElement[]) => {
    if (isTimeTravelRef.current) return;

    const snap: EditorElement[] = structuredClone(nextElements);

    const currHistory = historyRef.current;
    const currStep = historyStepRef.current;

    const sliced = currHistory.slice(0, currStep + 1);

    const last = sliced[sliced.length - 1];
    const same =
      last &&
      last.length === snap.length &&
      JSON.stringify(last) === JSON.stringify(snap);

    if (same) return;

    sliced.push(snap);

    historyRef.current = sliced;
    historyStepRef.current = sliced.length - 1;

    setHistory(sliced);
    setHistoryStep(sliced.length - 1);
  };

  const commitHistoryDebounced = (nextElements: EditorElement[], ms = 250) => {
    if (historyDebounceRef.current) window.clearTimeout(historyDebounceRef.current);

    historyDebounceRef.current = window.setTimeout(() => {
      commitHistory(nextElements);
      historyDebounceRef.current = null;
    }, ms);
  };

  const handleUndo = () => {
    const step = historyStepRef.current;
    if (step <= 0) return;

    isTimeTravelRef.current = true;

    const nextStep = step - 1;
    historyStepRef.current = nextStep;
    setHistoryStep(nextStep);

    const snap = historyRef.current[nextStep] ?? [];
    setElements(structuredClone(snap));

    queueMicrotask(() => {
      isTimeTravelRef.current = false;
    });
  };

  const handleRedo = () => {
    const step = historyStepRef.current;
    const hist = historyRef.current;
    if (step >= hist.length - 1) return;

    isTimeTravelRef.current = true;

    const nextStep = step + 1;
    historyStepRef.current = nextStep;
    setHistoryStep(nextStep);

    const snap = hist[nextStep] ?? [];
    setElements(structuredClone(snap));

    queueMicrotask(() => {
      isTimeTravelRef.current = false;
    });
  };

  // Inicializa histórico com o estado inicial real
  useEffect(() => {
    const initialSnap = structuredClone(elementsRef.current);
    historyRef.current = [initialSnap];
    historyStepRef.current = 0;
    setHistory([initialSnap]);
    setHistoryStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // ATALHOS DE TECLADO (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
  // =========================
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === "delete" || key === "backspace") {
        if (selectedIdsRef.current.length > 0) {
          e.preventDefault();
          handleDeleteSelected(selectedIdsRef.current);
        }
        return;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (!ctrlOrCmd) return;

      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // OVERLAY UPLOAD (editor)
  // =========================
  const handleEditorOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setEditorOverlay(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  // =========================
  // SANITIZE/RESTORE IMAGENS (export)
  // =========================
  const sanitizeImagesForExport = async () => {
    const originalSrcById: Record<string, string> = {};
    let changed = false;

    const sanitized = await Promise.all(
      elementsRef.current.map(async (el) => {
        if (
          el.type === "image" &&
          el.src &&
          typeof el.src === "string" &&
          el.src.startsWith("http")
        ) {
          try {
            originalSrcById[el.id] = el.src;
            const res = await fetch(el.src, { mode: "cors", cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();

            const b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("FileReader error"));
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            changed = true;
            return { ...el, src: b64 };
          } catch {
            return el;
          }
        }
        return el;
      })
    );

    return { sanitized, originalSrcById, changed };
  };

  const restoreImagesAfterExport = (originalSrcById: Record<string, string>) => {
    const ids = Object.keys(originalSrcById);
    if (ids.length === 0) return;

    setElements((prev) =>
      prev.map((el) => {
        if (el.type === "image" && originalSrcById[el.id]) {
          return { ...el, src: originalSrcById[el.id] };
        }
        return el;
      })
    );
  };

  // =========================
  // PERSISTÊNCIA DE DRAFT (não perder ao sair)
  // =========================
  const draftKey = useMemo(() => {
    const seed = (autosaveKey || baseImage || "base").slice(0, 60);
    return `studio_editor_draft:${seed}`;
  }, [autosaveKey, baseImage]);

const persistDraftLocal = (draft: DraftPayload) => {
  try {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    // ignore
  }
};

  const clearEditorOverlay = () => {
    setEditorOverlay(null);
    const draft = { ...buildDraftPayload(), editorOverlay: null };
    persistDraftLocal(draft);
    onAutoSaveDraft?.(draft);
    toast.success("Overlay removido.");
  };

// ✅ Atualize o buildDraftPayload pra salvar tudo
const buildDraftPayload = (): DraftPayload => ({
  elements: elementsRef.current,
  bgColor,
  canvasFormatId: canvasFormat.id,
  editorOverlay,
  customFonts,
});

// =========================
// Carrega draft local se não veio initialDraft
// =========================
useEffect(() => {
  if (initialDraft) return;

  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Partial<DraftPayload>;

    if (parsed.elements?.length) setElements(normalizeElements(parsed.elements));
    if (typeof parsed.bgColor === "string") setBgColor(parsed.bgColor);

    // ✅ UMA única regra, sem duplicidade
    if (typeof parsed.editorOverlay !== "undefined") {
      setEditorOverlay(parsed.editorOverlay ?? null);
    }

    if (Array.isArray(parsed.customFonts)) {
      setCustomFonts(parsed.customFonts);
    }

    if (typeof parsed.canvasFormatId === "string") {
      const fmt = CANVAS_FORMATS.find((f) => f.id === parsed.canvasFormatId);
      if (fmt) setCanvasFormat(fmt);
    }

    // ✅ sincroniza histórico com o draft carregado
    const snap = structuredClone(
      normalizeElements(
        (parsed.elements as EditorElement[] | undefined) ?? elementsRef.current
      )
    );
    historyRef.current = [snap];
    historyStepRef.current = 0;
    setHistory([snap]);
    setHistoryStep(0);
  } catch {
    // ignore
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [draftKey, initialDraft]);

// =========================
// Auto-save local (debounced) + callback silencioso
// =========================
const draftDebounceRef = useRef<number | null>(null);

useEffect(() => {
  if (isInteractingRef.current) return;
  if (draftDebounceRef.current) window.clearTimeout(draftDebounceRef.current);

  draftDebounceRef.current = window.setTimeout(() => {
    const draft = buildDraftPayload();
    persistDraftLocal(draft);

    // ✅ autosave silencioso pro pai (ImageStudio) manter estado em memória
    onAutoSaveDraft?.(draft);

    draftDebounceRef.current = null;
  }, 350);

  return () => {
    if (draftDebounceRef.current) window.clearTimeout(draftDebounceRef.current);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [elements, bgColor, canvasFormat.id, editorOverlay, customFonts]);

  // =========================
  // FUNÇÕES DE SALVAMENTO BLINDADAS
  // =========================
  const safeSaveToLibrary = async (url: string) => {
    if (!onSaveToLibrary) {
      toast.error("Ação não configurada.");
      return;
    }

    try {
      await onSaveToLibrary(url);
    } catch (err) {
      console.error("Erro no onSaveToLibrary:", err);
      const msg = err instanceof Error ? err.message : "Erro ao enviar para biblioteca.";
      toast.error(msg);
    }
  };

  const withTimeout = async <T,>(p: Promise<T>, ms = 20000) => {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ao enviar para aprovação.")), ms)
    ),
  ]);
};

const safeSaveToApproval = async (url: string, draft?: DraftPayload) => {
  if (!onSaveToApproval) {
    toast.error("Ação não configurada.");
    return;
  }

  try {
    await onSaveToApproval(url, draft);
  } catch (err) {
    console.error("Erro no onSaveToApproval:", err);
    throw err;
  }
};

  // =========================
  // UPDATE ELEMENT
  // =========================
  const updateElement = (
    id: string,
    updates: Partial<EditorElement>,
    opts?: { skipHistory?: boolean }
  ) => {
    setElements((prev) => {
      const next = prev.map((el) => (el.id === id ? { ...el, ...updates } : el));
      if (!opts?.skipHistory) commitHistoryDebounced(next);
      return next;
    });
  };

  // =========================
  // LAYERS
  // =========================
  const moveLayer = (direction: "up" | "down" | "top" | "bottom") => {
    if (!firstSelected) return;

    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === firstSelected.id);
      if (idx < 0) return prev;

      const newElements = [...prev];
      const [item] = newElements.splice(idx, 1);

      if (direction === "up") {
        newElements.splice(Math.min(idx + 1, newElements.length), 0, item);
      } else if (direction === "down") {
        newElements.splice(Math.max(idx - 1, 0), 0, item);
      } else if (direction === "top") {
        newElements.push(item);
      } else if (direction === "bottom") {
        newElements.unshift(item);
      }

      commitHistory(newElements);
      return newElements;
    });
  };

  // =========================
  // SELECTION / GROUPING
  // =========================
  const handleSelection = (id: string, multiSelect: boolean) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;

    if (el.groupId) {
      const groupIds = elements
        .filter((e) => e.groupId === el.groupId)
        .map((e) => e.id);

      if (multiSelect) {
        const allSelected = groupIds.every((gid) => selectedIds.includes(gid));
        setSelectedIds(
          allSelected
            ? selectedIds.filter((sid) => !groupIds.includes(sid))
            : Array.from(new Set([...selectedIds, ...groupIds]))
        );
      } else {
        setSelectedIds(groupIds);
      }
      return;
    }

    if (multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const handleGroup = () => {
    if (selectedIds.length < 2) return;
    const newGroupId = `group-${Date.now()}`;

    setElements((prev) => {
      const next = prev.map((el) =>
        selectedIds.includes(el.id) ? { ...el, groupId: newGroupId } : el
      );
      commitHistory(next);
      return next;
    });

    toast.success("Elementos agrupados");
  };

  const handleUngroup = () => {
    const selectedEls = elements.filter((el) => selectedIds.includes(el.id));
    const groupIdsToDissolve = Array.from(
      new Set(selectedEls.map((e) => e.groupId).filter(Boolean))
    ) as string[];

    if (groupIdsToDissolve.length === 0) return;

    setElements((prev) => {
      const next = prev.map((el) =>
        el.groupId && groupIdsToDissolve.includes(el.groupId)
          ? { ...el, groupId: undefined }
          : el
      );
      commitHistory(next);
      return next;
    });

    toast.success("Desagrupados");
  };

  // =========================
  // ALIGN / CROP
  // =========================
  const handleAlign = (axis: "h" | "v") => {
    setElements((prev) => {
      const next = prev.map((el) => {
        if (!selectedIds.includes(el.id)) return el;
        return axis === "h" ? { ...el, x: 50 } : { ...el, y: 50 };
      });
      commitHistory(next);
      return next;
    });
  };

  // =========================
  // DELETE ELEMENTS
  // =========================
  const handleDeleteSelected = (ids?: string[]) => {
    const targetIds = ids ?? selectedIdsRef.current;
    if (!targetIds.length) {
      toast.info("Selecione um elemento.");
      return;
    }

    setElements((prev) => {
      const next = prev.filter(
        (el) => el.id === "base-img" || !targetIds.includes(el.id)
      );
      commitHistory(next);
      return next;
    });

    setSelectedIds([]);
    toast.success("Elemento(s) removido(s).");
  };

  const toggleCropMode = () => {
    if (selectedIds.length !== 1) return;
    const el = elements.find((e) => e.id === selectedIds[0]);
    if (!el || el.type !== "image") return;

    setIsCropping((prev) => {
      const next = !prev;
      updateElement(el.id, { lockedRatio: next ? false : true });
      if (next) toast.info("Arraste para posicionar.");
      return next;
    });
  };

  const panCrop = (id: string, dxPct: number, dyPct: number) => {
    setElements((prev) => {
      const next = prev.map((el) => {
        if (el.id !== id || el.type !== "image") return el;

        const crop = el.crop ?? { ...DEFAULT_CROP };
        const zoomFactor = Math.max(1, crop.zoom / 100);

        const nextX = crop.x + (dxPct / 10) / zoomFactor;
        const nextY = crop.y + (dyPct / 10) / zoomFactor;

        return {
          ...el,
          crop: { ...crop, x: clamp(nextX, 0, 100), y: clamp(nextY, 0, 100) },
        };
      });

      return next;
    });
  };

  // =========================
  // EXPORT
  // =========================
  const [isExporting, setIsExporting] = useState(false);

  // ESTADOS DO MOCKUP (mantidos)
  const [isMockupMode, setIsMockupMode] = useState(false);
  const [mockupPreviewUrl, setMockupPreviewUrl] = useState<string | null>(null);
  const [selectedMockup, setSelectedMockup] = useState(MOCKUP_TEMPLATES[0]);
  const [isExportingMockup, setIsExportingMockup] = useState(false);
  const [mockupOverlay, setMockupOverlay] = useState<string | null>(null);
  const [mockupTransform, setMockupTransform] = useState({ scale: 1, x: 0, y: 0 });

  const waitNextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const generateFinalImage = async (): Promise<string | null> => {
    const node = canvasRef.current;
    if (!node || isExporting) return null;

    setIsExporting(true);
    setSelectedIds([]);
    setIsCropping(false);

    const { sanitized, originalSrcById, changed } = await sanitizeImagesForExport();
    if (changed) {
      setElements(sanitized);
      await waitNextFrame();
      await waitNextFrame();
    }

    await waitNextFrame();
    await waitNextFrame();

    try {
      try {
        await (document as any).fonts?.ready;
      } catch {
        // ignore
      }

      const canvas = await html2canvas(node, {
        useCORS: true,
        backgroundColor: bgColor,
        scale: 2,
        logging: false,
      });

      return canvas.toDataURL("image/png", 1.0);
    } catch {
      toast.error("Erro ao gerar imagem");
      return null;
    } finally {
      if (changed) restoreImagesAfterExport(originalSrcById);
      setIsExporting(false);
    }
  };

  const handleExportToApproval = async () => {
  toast.loading("Enviando para aprovação...", { id: "approval" });

  try {
    const latestDraft = buildDraftPayload();
    persistDraftLocal(latestDraft);
    onAutoSaveDraft?.(latestDraft);

    const url = await generateFinalImage();
    if (!url) throw new Error("Falha ao gerar imagem");

    await safeSaveToApproval(url, latestDraft);

    toast.success("Enviado para aprovação!", { id: "approval" });
  } catch (err: any) {
    toast.error(err?.message || "Erro ao enviar.", { id: "approval" });
  }
};

  const handleExportToLibrary = async () => {
    const url = await generateFinalImage();
    if (url) await safeSaveToLibrary(url);
  };

  const handleDownloadFinalImage = async () => {
    const url = await generateFinalImage();
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = `arte-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download iniciado!");
  };

  const handleOpenMockup = async () => {
    toast.loading("Renderizando base do Mockup...", { id: "mockup" });
    const url = await generateFinalImage();

    if (url) {
      setMockupPreviewUrl(url);
      setIsMockupMode(true);
      toast.success("Mockup pronto!", { id: "mockup" });
    } else {
      toast.error("Erro.", { id: "mockup" });
    }
  };

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setMockupOverlay(ev.target?.result as string);
      toast.success("Identidade da marca aplicada!");
    };
    reader.readAsDataURL(file);
  };

  const handleSendMockupToApproval = async () => {
    const node = mockupRef.current;
    if (!node || isExportingMockup) return;

    setIsExportingMockup(true);
    toast.loading("Enviando Mockup...", { id: "mockup-send" });

    try {
      const canvas = await html2canvas(node, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      const mockupB64 = canvas.toDataURL("image/png", 1.0);
      await safeSaveToApproval(mockupB64);
      toast.success("Mockup enviado para aprovação!", { id: "mockup-send" });
    } catch {
      toast.error("Erro.", { id: "mockup-send" });
    } finally {
      setIsExportingMockup(false);
    }
  };

  const handleDownloadMockup = async () => {
    const node = mockupRef.current;
    if (!node || isExportingMockup) return;

    setIsExportingMockup(true);

    try {
      const canvas = await html2canvas(node, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        logging: false,
      });

      const mockupB64 = canvas.toDataURL("image/png", 1.0);
      const a = document.createElement("a");
      a.href = mockupB64;
      a.download = `social-mockup-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Mockup Baixado!");
    } catch {
      toast.error("Erro.");
    } finally {
      setIsExportingMockup(false);
    }
  };

  // =========================
  // ADD ELEMENTS
  // =========================
  const addText = () => {
    const newEl: EditorElement = {
      id: Date.now().toString(),
      type: "text",
      content: "Novo Texto",
      x: 50,
      y: 50,
      width: 0,
      height: 0,
      rotation: 0,
      opacity: 1,
      lockedRatio: true,
      style: { font: "Montserrat", size: 50, align: "center", color: "#ffffff" },
    };

    setElements((prev) => {
      const next = [...prev, newEl];
      commitHistory(next);
      return next;
    });

    setSelectedIds([newEl.id]);
  };

  const addShape = (shape: "rect" | "circle" | "line" | "arrow") => {
    const newEl: EditorElement = {
      id: Date.now().toString(),
      type: "shape",
      shape,
      x: 50,
      y: 50,
      width: shape === "line" || shape === "arrow" ? 40 : 20,
      height: shape === "line" || shape === "arrow" ? 10 : 20,
      rotation: 0,
      opacity: 1,
      color: "#000000",
      lockedRatio: false,
      shapeStyle: { ...DEFAULT_SHAPE_STYLE },
    };

    setElements((prev) => {
      const next = [...prev, newEl];
      commitHistory(next);
      return next;
    });

    setSelectedIds([newEl.id]);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const newEl: EditorElement = {
        id: Date.now().toString(),
        type: "image",
        src: ev.target?.result as string,
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        rotation: 0,
        opacity: 1,
        lockedRatio: true,
        crop: { ...DEFAULT_CROP },
      };

      setElements((prev) => {
        const next = [...prev, newEl];
        commitHistory(next);
        return next;
      });

      setSelectedIds([newEl.id]);
    };

    reader.readAsDataURL(file);
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fontName = file.name.replace(/\.[^/.]+$/, "");

    try {
      const fontUrl = URL.createObjectURL(file);
      const fontFace = new FontFace(fontName, `url(${fontUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);

      setCustomFonts((prev) => [...prev, { name: fontName }]);
      toast.success("Fonte instalada!");

      if (firstSelected?.type === "text" && firstSelected.style) {
        updateElement(firstSelected.id, {
          style: { ...firstSelected.style, font: fontName },
        });
      }
    } catch {
      toast.error("Erro.");
    }
  };

  // =========================
  // POINTER EVENTS
  // =========================
  const handlePointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: "move" | "resize"
  ) => {
    e.stopPropagation();
    isInteractingRef.current = true;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (mode === "move" && !isCropping) {
      if (!selectedIds.includes(id) && !e.shiftKey) handleSelection(id, false);
      else if (e.shiftKey) handleSelection(id, true);
    }

    setInteractionMode(isCropping && mode === "move" ? "pan_crop" : mode);
    dragStart.current = { x: e.clientX, y: e.clientY };

    const snap: Record<
      string,
      { x: number; y: number; w: number; h: number; fontSize: number }
    > = {};

    elementsRef.current.forEach((el) => {
      if (selectedIds.includes(el.id) || el.id === id) {
        snap[el.id] = {
          x: el.x,
          y: el.y,
          w: el.width,
          h: el.height,
          fontSize: el.style?.size ?? 0,
        };
      }
    });

    elementsStart.current = snap;
  };

  const applyPointerMove = (clientX: number, clientY: number) => {
    if (interactionMode === "none" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaXPx = clientX - dragStart.current.x;
    const deltaYPx = clientY - dragStart.current.y;
    const dxPct = (deltaXPx / rect.width) * 100;
    const dyPct = (deltaYPx / rect.height) * 100;

    if (interactionMode === "pan_crop") {
      const id = selectedIds[0];
      if (id) panCrop(id, dxPct, dyPct);
      return;
    }

    selectedIds.forEach((sid) => {
      const start = elementsStart.current[sid];
      if (!start) return;

      const el = elementsRef.current.find((x) => x.id === sid);
      if (!el) return;

      if (interactionMode === "move") {
        updateElement(sid, { x: start.x + dxPct, y: start.y + dyPct }, { skipHistory: true });
      }

      if (interactionMode === "resize") {
        if (el.type === "text") {
          const scale = (deltaXPx + deltaYPx) / 2;
          updateElement(sid, {
            style: { ...el.style!, size: Math.max(10, start.fontSize + scale) },
          }, { skipHistory: true });
          return;
        }

        const minSize = 5;
        const dw = dxPct;
        const dh = dyPct;
        const dominant = Math.abs(dw) >= Math.abs(dh) ? "w" : "h";

        if (el.lockedRatio && !isCropping) {
          const ratio = start.h / Math.max(0.0001, start.w);

          let nextW = start.w;
          let nextH = start.h;

          if (dominant === "w") {
            nextW = Math.max(minSize, start.w + dw);
            nextH = Math.max(minSize, nextW * ratio);
          } else {
            nextH = Math.max(minSize, start.h + dh);
            nextW = Math.max(minSize, nextH / Math.max(0.0001, ratio));
          }

          updateElement(sid, { width: nextW, height: nextH }, { skipHistory: true });
          return;
        }

        const nextW = Math.max(minSize, start.w + dw);
        const nextH = Math.max(minSize, start.h + dh);
        updateElement(sid, { width: nextW, height: nextH }, { skipHistory: true });
      }
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interactionMode === "none") return;
    latestMoveRef.current = { x: e.clientX, y: e.clientY };
    if (rafMoveRef.current) return;
    rafMoveRef.current = window.requestAnimationFrame(() => {
      rafMoveRef.current = null;
      const latest = latestMoveRef.current;
      if (latest) applyPointerMove(latest.x, latest.y);
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setInteractionMode("none");
    isInteractingRef.current = false;

    try {
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    commitHistory(elementsRef.current);
  };

  // =========================
  // CLOSE EDITOR (auto-salva draft + render)
  // =========================
  const handleCloseEditor = async () => {
  try {
    // 1) salva draft editável (texto/elementos/overlay)
    const draft = buildDraftPayload();
    persistDraftLocal(draft);
    onAutoSaveDraft?.(draft);

    // 2) gera render final (imagem) com timeout pra não travar
    const renderPromise = generateFinalImage();

    const url = await Promise.race<string | null>([
      renderPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
    ]);

    if (url) onAutoSaveRender?.(url);
  } catch (err) {
    console.error("handleCloseEditor error:", err);
  } finally {
    onClose();
  }
};

  // =========================
  // RENDER
  // =========================
  return (
    <div
      className="fixed inset-0 z-[50] bg-[#121212] flex flex-col animate-in fade-in"
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {/* HEADER PRINCIPAL DO EDITOR */}
      <div className="h-14 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4 z-[55]">
        <div className="flex items-center gap-4">
          <div className="flex bg-black rounded-lg p-1 gap-1">
            {CANVAS_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setCanvasFormat(fmt)}
                className={`p-1.5 rounded ${
                  canvasFormat.id === fmt.id ? "bg-zinc-800 text-white" : "text-zinc-500"
                }`}
                title={fmt.label}
              >
                <fmt.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#333]" />

          <div className="flex gap-1">
            {/* BOTÕES DE UNDO / REDO */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={handleUndo}
              disabled={historyStep === 0}
              title="Desfazer (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={handleRedo}
              disabled={historyStep === history.length - 1}
              title="Refazer (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo className="w-4 h-4" />
            </Button>

            <div className="h-4 w-px bg-[#333] mx-1 self-center" />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => handleAlign("h")}
              title="Centralizar Horizontal"
            >
              <AlignHorizontalJustifyCenter className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => handleAlign("v")}
              title="Centralizar Vertical"
            >
              <AlignVerticalJustifyCenter className="w-4 h-4" />
            </Button>

            {isMultiSelect && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-2 bg-purple-900/30 text-purple-300"
                onClick={handleGroup}
              >
                <Group className="w-3 h-3" /> Agrupar
              </Button>
            )}

            {isGroup && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-2 bg-zinc-800"
                onClick={handleUngroup}
              >
                <Ungroup className="w-3 h-3" /> Desagrupar
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-2 bg-red-900/20 text-red-300"
              onClick={() => handleDeleteSelected(selectedIds)}
              disabled={selectedIds.length === 0}
              title="Delete / Backspace"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCloseEditor}
            className="hover:bg-red-900/30 hover:text-red-400 text-zinc-300"
          >
            <X className="w-4 h-4 mr-2" /> Fechar Editor
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT TOOLBAR */}
        <div className="w-[84px] bg-[#1e1e1e] border-r border-[#333] flex flex-col items-center py-4 gap-5 z-[55]">
          <button
            onClick={addText}
            className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
          >
            <Type className="w-5 h-5" /> Texto
          </button>

          <div className="relative group flex flex-col items-center gap-1 cursor-pointer">
            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-white" />
            <span className="text-[10px] text-zinc-400">Upload</span>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept="image/*"
              onChange={handleUpload}
            />
          </div>

          <button
            onClick={() => addShape("rect")}
            className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
          >
            <Square className="w-5 h-5" /> Ret
          </button>

          <button
            onClick={() => addShape("circle")}
            className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
          >
            <Circle className="w-5 h-5" /> Círc
          </button>

          <button
            onClick={() => addShape("line")}
            className="flex flex-col items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
          >
            <Minus className="w-5 h-5" /> Linha
          </button>
        </div>

        {/* RIGHT PROPERTIES */}
        <div className="w-80 bg-[#1e1e1e] border-l border-[#333] p-4 z-[55] overflow-y-auto absolute right-0 top-14 bottom-0 flex flex-col">
          <div className="flex-1">
            {firstSelected ? (
              <div className="space-y-6">
                <div className="text-xs font-bold text-white uppercase border-b border-[#333] pb-2 flex justify-between items-center">
                  {isMultiSelect ? "Múltiplos Itens" : firstSelected.type}

                  {!isMultiSelect && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-300"
                      onClick={() => {
                        setElements((prev) => {
                          const next = prev.filter((e) => e.id !== firstSelected.id);
                          commitHistory(next);
                          return next;
                        });
                        setSelectedIds([]);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {!isMultiSelect && (
                  <div className="flex justify-between items-center bg-zinc-900 p-2 rounded border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-widest">
                      <Layers className="w-3 h-3 text-purple-500" /> Camada
                    </span>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => {
                          const base = elements.find((e) => e.id === "base-img");
                          if (base) setSelectedIds(["base-img"]);
                        }}
                        title="Selecionar Fundo"
                      >
                        <Box className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => moveLayer("bottom")}
                      >
                        <ChevronsDown className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => moveLayer("down")}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => moveLayer("up")}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => moveLayer("top")}
                      >
                        <ChevronsUp className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {!isMultiSelect && (
                  <div className="space-y-2 p-3 bg-zinc-900 rounded border border-zinc-800">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Droplet className="w-3 h-3" /> Opacidade
                      </label>
                      <span className="text-[10px] text-white">
                        {Math.round((firstSelected.opacity ?? 1) * 100)}%
                      </span>
                    </div>

                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[firstSelected.opacity ?? 1]}
                      onValueChange={([v]) =>
                        updateElement(firstSelected.id, { opacity: v })
                      }
                    />
                  </div>
                )}

                {/* EDIÇÃO DE TEXTO */}
                {firstSelected.type === "text" && firstSelected.style && !isMultiSelect && (
                  <div className="space-y-4 p-3 bg-zinc-900 rounded border border-zinc-800">
                    <textarea
                      className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-sm focus:border-purple-500 outline-none"
                      value={firstSelected.content ?? ""}
                      onChange={(e) =>
                        updateElement(firstSelected.id, { content: e.target.value })
                      }
                    />

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">
                        Tipografia e Cor
                      </label>

                      <select
                        className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white mb-2"
                        value={firstSelected.style.font ?? "Inter"}
                        onChange={(e) =>
                          updateElement(firstSelected.id, {
                            style: { ...firstSelected.style!, font: e.target.value },
                          })
                        }
                      >
                        {allFonts.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-4 items-center border-t border-zinc-800 pt-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-zinc-400">Upload de Fonte</span>
                          <div className="relative">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-zinc-700 text-xs px-2"
                            >
                              <Upload className="w-3 h-3 mr-1" /> .TTF
                            </Button>
                            <input
                              type="file"
                              accept=".ttf,.otf"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={handleFontUpload}
                              title="Fazer upload de fonte"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-zinc-400">Cor da Letra</span>
                          <input
                            type="color"
                            className="w-14 h-8 rounded border border-zinc-700 p-0 cursor-pointer shrink-0"
                            value={firstSelected.style.color ?? "#000000"}
                            onChange={(e) =>
                              updateElement(firstSelected.id, {
                                style: { ...firstSelected.style!, color: e.target.value },
                              })
                            }
                            title="Escolher cor"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIÇÃO DE FORMAS */}
                {firstSelected.type === "shape" &&
                  (firstSelected.shape === "rect" || firstSelected.shape === "circle") &&
                  !isMultiSelect && (
                    <div className="space-y-2 p-3 bg-zinc-900 rounded border border-zinc-800">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">
                        Cor da Forma
                      </label>
                      <input
                        type="color"
                        className="w-full h-10 rounded border border-zinc-700 p-0 cursor-pointer"
                        value={firstSelected.color ?? "#000000"}
                        onChange={(e) =>
                          updateElement(firstSelected.id, { color: e.target.value })
                        }
                      />
                    </div>
                  )}

                {/* EDIÇÃO DE LINHAS */}
                {firstSelected.type === "shape" &&
                  firstSelected.shape === "line" &&
                  !isMultiSelect && (
                    <div className="space-y-4 p-3 bg-zinc-900 rounded border border-zinc-800">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">
                        Estilo da Linha
                      </label>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="w-10 h-8 rounded border border-zinc-700 p-0 cursor-pointer shrink-0"
                            value={firstSelected.color ?? "#000000"}
                            onChange={(e) =>
                              updateElement(firstSelected.id, { color: e.target.value })
                            }
                            title="Cor da Linha"
                          />

                          <select
                            className="flex-1 bg-black border border-zinc-700 rounded p-1 text-xs text-white"
                            value={firstSelected.lineStyle ?? "solid"}
                            onChange={(e) =>
                              updateElement(firstSelected.id, { lineStyle: e.target.value })
                            }
                          >
                            <option value="solid">Sólida (───)</option>
                            <option value="dashed">Tracejada (- - -)</option>
                            <option value="dotted">Pontilhada (. . .)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[9px] text-zinc-400">Espessura</span>
                            <span className="text-[9px] text-white">
                              {firstSelected.lineWeight ?? 4}px
                            </span>
                          </div>

                          <Slider
                            min={1}
                            max={20}
                            step={1}
                            value={[firstSelected.lineWeight ?? 4]}
                            onValueChange={([v]) =>
                              updateElement(firstSelected.id, { lineWeight: v })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center pt-20 flex flex-col items-center opacity-50">
                <Box className="w-10 h-10 mb-4 text-zinc-600" />
                <p className="text-zinc-400 text-xs font-medium">
                  Selecione um elemento para editar.
                </p>
              </div>
            )}

            {/* OVERLAY DA MARCA - SEMPRE VISÍVEL */}
            <div className="space-y-3 pt-6 mt-6 border-t border-zinc-800">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-3 h-3 text-purple-400" /> Overlay da Marca
              </h3>

              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-700 rounded-xl hover:border-purple-500 hover:bg-zinc-900 cursor-pointer transition group">
                <Upload className="w-5 h-5 text-zinc-500 mb-1 group-hover:text-purple-400 transition" />
                <span className="text-[11px] font-bold text-zinc-300 text-center">
                  Escolher PNG
                  <br />
                  (Fundo Transparente)
                </span>
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={handleEditorOverlayUpload}
                />
              </label>

              {editorOverlay && (
                <button
                  onClick={clearEditorOverlay}
                  className="text-xs font-bold text-red-400 hover:text-red-300 w-full text-center flex items-center justify-center gap-1 mt-2"
                >
                  <Trash2 className="w-3 h-3" /> Remover Overlay
                </button>
              )}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-zinc-800 space-y-4 shrink-0">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">
                Fundo do Canvas
              </label>
              <input
                type="color"
                className="w-full h-8 cursor-pointer rounded border border-zinc-700"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="sm"
                className="w-full text-xs bg-purple-600 text-white hover:bg-purple-700 font-extrabold shadow-lg shadow-purple-900/20"
                onClick={handleExportToApproval}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}{" "}
                Enviar Arte Final p/ Aprovação
              </Button>
              <Button
                size="sm"
                className="w-full text-xs bg-blue-600 text-white hover:bg-blue-700 font-extrabold shadow-lg shadow-blue-900/20"
                onClick={handleExportToLibrary}
                disabled={isExporting}
              >
                <Library className="w-4 h-4 mr-2" /> Enviar para Biblioteca
              </Button>
            </div>
          </div>
        </div>

        {/* CANVAS (CENTRO) */}
        <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden p-10 select-none mr-80 z-[51]">
          <div
            ref={canvasRef}
            className="relative shadow-2xl bg-white overflow-hidden ring-1 ring-zinc-800"
            style={{
              height: "80vh",
              aspectRatio: canvasFormat.aspect,
              backgroundColor: bgColor,
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedIds([]);
              }
            }}
          >
            {elements.map((el, index) => {
              const isSelected = selectedIds.includes(el.id);

              const isBase = el.id === "base-img";
              const zIndex = isBase ? 0 : 10 + index;
              const pointerEvents =
                isBase && !isSelected && !isCropping ? "none" : "auto";

              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handlePointerDown(e, el.id, "move")}
                  className="absolute group cursor-move"
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: el.type === "text" ? "auto" : `${el.width}%`,
                    height: el.type === "text" ? "auto" : `${el.height}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                    border: isSelected ? "1px solid #a855f7" : "1px solid transparent",
                    overflow: el.type === "image" ? "hidden" : "visible",
                    opacity: el.opacity ?? 1,
                    zIndex,
                    pointerEvents,
                  }}
                >
                  {/* IMAGEM */}
                  {el.type === "image" && (
                    <img
                      src={el.src}
                      draggable={false}
                      className="w-full h-full pointer-events-none"
                      style={{ objectFit: "cover", transformOrigin: "center" }}
                    />
                  )}

                  {/* TEXTO */}
                  {el.type === "text" && (
                    <p
                      style={{
                        fontSize: `${el.style?.size ?? 40}px`,
                        color: el.style?.color ?? "#000000",
                        fontFamily: el.style?.font ?? "Inter",
                        fontWeight: "bold",
                        textAlign: el.style?.align ?? "center",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {el.content ?? ""}
                    </p>
                  )}

                  {/* FORMAS E LINHAS */}
                  {el.type === "shape" && el.shape === "rect" && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: el.color ?? "#000000",
                      }}
                    />
                  )}

                  {el.type === "shape" && el.shape === "circle" && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: el.color ?? "#000000",
                        borderRadius: "50%",
                      }}
                    />
                  )}

                  {el.type === "shape" && el.shape === "line" && (
                    <div
                      style={{
                        width: "100%",
                        height: el.lineWeight ?? 4,
                        borderTop: `${el.lineWeight ?? 4}px ${el.lineStyle ?? "solid"} ${
                          el.color ?? "#000000"
                        }`,
                        marginTop: "50%",
                      }}
                    />
                  )}

                  {/* ALÇAS DE REDIMENSIONAMENTO */}
                  {isSelected && (
                    <>
                      <div
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-50 shadow-md"
                        onPointerDown={(e) => handlePointerDown(e, el.id, "resize")}
                      />

                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-purple-500 rounded-full" />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-purple-500 rounded-full" />

                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-50 shadow-md"
                        onPointerDown={(e) => handlePointerDown(e, el.id, "resize")}
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* OVERLAY DA MARCA */}
            {editorOverlay && (
              <img
                src={editorOverlay}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ zIndex: 9999 }}
                alt="Overlay"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

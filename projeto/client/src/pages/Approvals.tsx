import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  CheckCircle2, XCircle, MessageSquare, ChevronLeft,
  ChevronRight, ZoomIn, ZoomOut, History, Share2,
  Download, Eye, MoreHorizontal, PenTool, Layout,
  Smartphone, Monitor, ChevronDown, User, Clock, Filter, UserCheck,
  Edit2, Trash2, FileX, Link, Sparkles, Loader2, X, ImageIcon, Upload, Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase, supabaseUrl } from "../lib/supabase";
import { updateTaskStatus } from "../lib/tasks";
import { useLocation } from "wouter";

// --- COMPONENTE: MOLDURA DE DISPOSITIVO ---
const DeviceFrame = ({ children, mode, type }: { children: React.ReactNode, mode: 'desktop' | 'mobile', type: string }) => {
    // Se for texto, não usamos a moldura de iPhone, apenas centralizamos.
    if (type === 'text') {
        return <div className="w-full h-full overflow-y-auto bg-slate-200/50">{children}</div>;
    }

    if (mode === 'desktop') {
        return <div className="w-full h-full flex justify-center">{children}</div>;
    }

    return (
        <div className="flex justify-center h-full py-4 transition-all duration-500 ease-in-out">
            <div className="relative w-[375px] h-[667px] bg-black rounded-[40px] border-[8px] border-zinc-900 shadow-2xl overflow-hidden flex flex-col">
                <div className="h-7 bg-white w-full flex justify-between items-center px-6 text-[10px] font-bold text-black border-b border-gray-100 z-10 shrink-0">
                    <span>9:41</span>
                    <div className="flex gap-1"><div className="w-3 h-3 bg-black rounded-full opacity-20"></div><div className="w-3 h-3 bg-black rounded-full opacity-20"></div></div>
                </div>
                
                {type === 'image' && (
                    <div className="h-10 bg-white flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
                        <div className="font-bold text-xs">Instagram</div>
                        <MoreHorizontal className="w-4 h-4 text-gray-400"/>
                    </div>
                )}

                <div className="flex-1 bg-white overflow-y-auto scrollbar-hide relative">
                    {children}
                </div>

                <div className="h-6 bg-white w-full flex justify-center items-center shrink-0">
                    <div className="w-24 h-1 bg-gray-300 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE: REVISÃO DE IMAGEM ---
const ImageReviewer = ({ item, pins, onAddPin, onDeletePin, viewMode }: any) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [commentText, setCommentText] = useState("");
  const [tempPin, setTempPin] = useState<{x: number, y: number} | null>(null);

  const handleImageClick = (e: React.MouseEvent) => {
    if (!imgRef.current || item.status === 'approved') return; 
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTempPin({ x, y });
  };

  const savePin = () => {
    if (tempPin && commentText) {
      onAddPin({ ...tempPin, text: commentText, id: Date.now() });
      setTempPin(null);
      setCommentText("");
    }
  };

  const containerClass = viewMode === 'mobile' 
    ? "w-full h-full bg-white relative" 
    : "relative inline-block bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-inner";

  const imgClass = viewMode === 'mobile'
    ? "w-full h-auto"
    : `max-h-[60vh] object-contain ${item.status === 'approved' ? 'cursor-default' : 'cursor-crosshair'}`;



  return (
    <div className={viewMode === 'desktop' ? "flex justify-center" : "h-full"}>
      <div className={containerClass}>
        <img 
          ref={imgRef}
          src={item.content_url} 
          alt="Review" 
          className={imgClass}
          onClick={handleImageClick}
        />
        
        {pins.map((pin: any, idx: number) => (
          <div key={pin.id} className="absolute group z-10" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
            <div className="w-6 h-6 -ml-3 -mt-3 md:w-8 md:h-8 md:-ml-4 md:-mt-4 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-sm shadow-lg border-2 border-white cursor-pointer transform transition hover:scale-110">{idx + 1}</div>
            <div className="absolute left-6 top-0 bg-white p-3 rounded-lg shadow-xl border border-slate-100 w-40 md:w-48 z-20 hidden group-hover:block animate-in fade-in slide-in-from-left-2">
              <p className="text-xs text-slate-700 font-medium">{pin.text}</p>
              {item.status !== 'approved' && <button onClick={(e) => { e.stopPropagation(); onDeletePin(pin.id); }} className="text-[10px] text-red-500 mt-2 hover:underline">Excluir</button>}
            </div>
          </div>
        ))}

        {tempPin && (
          <div className="absolute z-20" style={{ left: `${tempPin.x}%`, top: `${tempPin.y}%` }}>
            <div className="w-6 h-6 -ml-3 -mt-3 md:w-8 md:h-8 md:-ml-4 md:-mt-4 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs md:text-sm shadow-lg border-2 border-white animate-bounce">+</div>
            <div className={`absolute top-0 bg-white p-3 rounded-lg shadow-2xl border border-slate-200 w-56 z-30 ${tempPin.x > 50 ? 'right-8' : 'left-8'}`}>
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Comentar</p>
              <textarea autoFocus className="w-full text-xs border border-slate-300 rounded p-2 text-slate-700 focus:outline-none focus:border-blue-500 mb-2 resize-none" rows={2} value={commentText} onChange={e => setCommentText(e.target.value)}/>
              <div className="flex justify-end gap-2"><button onClick={() => setTempPin(null)} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button><button onClick={savePin} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold">Salvar</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE: REVISÃO DE TEXTO ---
const TextReviewer = ({ item, viewMode }: any) => {
  return (
    <div className={`flex justify-center w-full h-full ${viewMode === 'desktop' ? 'py-10' : 'p-0'}`}>
      <div 
        className={`
          bg-white shadow-2xl border border-slate-200 
          ${viewMode === 'desktop' ? 'w-[210mm] min-h-[297mm] p-20' : 'w-full h-full p-8'} 
          mx-auto relative mb-10
        `}
        style={{ fontFamily: '"Georgia", serif' }}
      >
        {/* Marca d'água ou Identificação do Departamento no topo da folha */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-6 mb-10 opacity-60">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Redação & Roteiro</span>
           <span className="text-[10px] font-bold text-slate-400">Versão {item.version}</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
          {item.title}
        </h1>
        
        {item.type === "planner" ? (
          <pre className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-auto">
            {item.content_text}
          </pre>
        ) : (
          <div 
            className="text-lg leading-[1.8] text-slate-800 space-y-4 text-justify"
            dangerouslySetInnerHTML={{ __html: item.content_text }} 
          />
        )}

        {/* Rodapé da folha */}
        <div className="mt-20 pt-10 border-t border-slate-100 text-[10px] text-slate-400 italic">
          Documento gerado para aprovação em {item.date} • {item.client}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE: PLANEJADOR DE CONTEÚDO ---
const PlannerReviewer = ({ item, viewMode }: any) => {
  let payload: any = item.planner_payload;
  if (!payload) {
    try {
      payload = JSON.parse(item.content_text || "{}");
    } catch {
      payload = null;
    }
  }

  const grid = payload?.planner?.grid || payload?.grid || [];
  const month = payload?.month || "Mês";
  const year = payload?.year || "";

  return (
    <div className={`flex justify-center w-full h-full ${viewMode === 'desktop' ? 'py-10' : 'p-0'}`}>
      <div className="bg-white shadow-2xl border border-slate-200 w-full max-w-5xl p-8 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Planejador de Conteúdo</div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{month} {year}</h2>
          </div>
        </div>

        {!Array.isArray(grid) || grid.length === 0 ? (
          <div className="text-slate-500 text-sm">Planner vazio ou inválido.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase w-40">Canal</th>
                  <th className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase w-40">Pilar</th>
                  <th className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">Sem 1</th>
                  <th className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">Sem 2</th>
                  <th className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">Sem 3</th>
                  <th className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">Sem 4</th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 border-b border-slate-100 text-sm font-bold text-slate-700">{row?.platform || "-"}</td>
                    <td className="p-3 border-b border-slate-100 text-sm text-slate-600">{row?.pillar || "-"}</td>
                    {(["w1", "w2", "w3", "w4"] as const).map((week) => (
                      <td key={week} className="p-3 border-b border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                        {row?.[week] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE: PAINEL DE NOTAS ---
const NotesSidebar = ({ notes, onOpenAdd, onDelete, onEdit }: any) => {
    return (
        <div className="w-80 bg-slate-50 border-l border-slate-200 p-4 space-y-4 flex flex-col h-full shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Notas Gerais
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
                {notes.length === 0 ? ( <div className="text-center py-10 text-slate-400 text-xs italic">Nenhuma observação.</div> ) : (
                    notes.map((note: any) => (
                        <div key={note.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm group relative">
                            <div className="flex items-center gap-2 mb-2"><div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">{note.user.charAt(0)}</div><span className="text-xs font-bold text-slate-700">{note.user}</span><span className="text-[9px] text-slate-400 ml-auto">{note.date}</span></div>
                            <p className="text-xs text-slate-600 leading-relaxed">{note.text}</p>
                            <div className="flex gap-2 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onDelete(note.id)} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Apagar</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <button onClick={onOpenAdd} className="w-full py-3 bg-white border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-100 hover:text-slate-700 hover:border-slate-400 transition flex items-center justify-center gap-2"><MessageSquare className="w-3 h-3" /> Adicionar Nota</button>
        </div>
    );
};

export default function Approvals() {
  const { activeTenant, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeClient, setActiveClient] = useState("Todos");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [pins, setPins] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTenant, setUploadTenant] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // BUSCA E SINCRONIZAÇÃO NO SUPABASE
  // ==========================================
  const fetchApprovalJobs = async () => {
    setIsLoading(true);
    
    // Puxa as aprovações e faz um "Join" simples na tabela tasks para pegar o Título
    const { data: approvalsData, error } = await supabase
        .from('approvals')
        .select(`
            *,
            tasks (
                title,
                description
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        toast.error("Erro ao sincronizar com a nuvem.");
        setIsLoading(false);
        return;
    }

   const formattedJobs = approvalsData.map((d: any) => {
        // Lógica de detecção de tipo: Prioridade para o campo 'type' do banco,
        // senão tenta adivinhar pelo conteúdo.
        let detectedType = d.type;
        if (!detectedType) {
            if (d.image_url) detectedType = "image";
            else if (d.video_url) detectedType = "video";
            else detectedType = "text"; // Fallback para texto
        } else if (detectedType === "image" && d.video_url && !d.image_url) {
            // proteção para registros antigos com type default "image"
            detectedType = "video";
        }

        const plannerPayload = d.metadata?.planner_payload;
        return {
            id: d.id,
            task_id: d.task_id,
            client: d.tenant_slug || "Geral",
            type: detectedType, 
            title: d.tasks?.title || (detectedType === "planner" ? "Planejador de Conteúdo" : "Conteúdo para Aprovação"),
            content_text: detectedType === "planner"
              ? (plannerPayload ? JSON.stringify(plannerPayload, null, 2) : "Planejador de conteúdo.")
              : (d.tasks?.description || ""),
            planner_payload: plannerPayload || null,
            version: "V1",
            date: new Date(d.created_at).toLocaleDateString('pt-BR'),
            content_url: d.image_url || d.video_url || "",
            status: d.status || "pending",
            general_notes: d.general_notes || [],
            pins: d.pins || []
        };
    });

    setJobs(formattedJobs);
    setIsLoading(false);
  };

  useEffect(() => { 
      fetchApprovalJobs(); 
      
      // Canal Realtime do Supabase: se o DA enviar uma arte, a tela atualiza na hora
      const channel = supabase.channel('realtime:approvals')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, 
        () => { 
            fetchApprovalJobs(); 
            toast.info("Nova movimentação nas aprovações!"); 
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); }
  }, []);

  // Build client list: admin/"all" sees every tenant in jobs; restricted users see only their allowed tenants
  const isAdminOrAll = !user?.allowedTenants?.length || user.allowedTenants.includes("all");
  const dynamicClients = isAdminOrAll
    ? ["Todos", ...Array.from(new Set(jobs.map(j => j.client).filter(Boolean)))]
    : (user?.allowedTenants?.length === 1
        ? user.allowedTenants
        : ["Todos", ...(user?.allowedTenants ?? [])]);

  const filteredJobs = useMemo(() => {
      let filtered = jobs;
      if (activeTenant && activeTenant !== "all") {
          filtered = filtered.filter(j => j.client === activeTenant);
      }
      if (activeClient !== "Todos") {
          filtered = filtered.filter(j => j.client === activeClient);
      }
      return filtered;
  }, [jobs, activeTenant, activeClient]);

  useEffect(() => {
    if (filteredJobs.length > 0 && (!selectedJob || !filteredJobs.find(j => j.id === selectedJob.id))) {
      setSelectedJob(filteredJobs[0]);
      setPins(filteredJobs[0].pins || []);
    } else if (filteredJobs.length === 0) {
      setSelectedJob(null);
      setPins([]);
    }
  }, [filteredJobs]);

  // ==========================================
  // AÇÕES COM O BANCO DE DADOS
  // ==========================================

  const handleApprove = async () => {
    if (!selectedJob) return;
    
    toast.loading("Aprovando peça...", { id: "approve" });
    
    // 1. Atualiza a tabela Approvals
    const { error: approvalError } = await supabase
        .from('approvals')
        .update({ status: 'approved' })
        .eq('id', selectedJob.id);
        
    // 2. Opcional: Atualiza a tabela Tasks para mover o card do Diretor de Arte para "Concluído"
    if (selectedJob.task_id) {
        await updateTaskStatus(selectedJob.task_id, "done");
    }

    if (approvalError) {
        toast.error("Erro ao aprovar.", { id: "approve" });
    } else {
        toast.success("Campanha Aprovada! 🚀", { id: "approve", description: "Produção notificada automaticamente." });
        const updatedJob = { ...selectedJob, status: 'approved' };
        setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
        setSelectedJob(updatedJob);
    }
  };

const handleReject = async () => {
    if (!selectedJob || !rejectReason.trim()) return;
    
    toast.loading("Devolvendo card para a Criação...", { id: "reject" });
    
    // 1. Atualiza o histórico de notas na Aprovação (para o cliente ter o registro)
    const newNote = { id: Date.now(), user: "Cliente (Ajuste Solicitado)", text: rejectReason, date: new Date().toLocaleDateString('pt-BR') };
    const updatedNotes = [...(selectedJob.general_notes || []), newNote];

    // Renomeamos para approvalError para evitar conflitos de nome
    const { error: approvalError } = await supabase
        .from('approvals')
        .update({
            status: 'changes_requested',
            general_notes: updatedNotes
        })
        .eq('id', selectedJob.id);

    // ========================================================
    // 2. O RETORNO NO FLUXO (KANBAN) E INJEÇÃO DE FEEDBACK
    // ========================================================
    if (selectedJob.task_id) {
        // Primeiro, pegamos o briefing original da tarefa para não apagar o que a Redação fez
        const { data: taskData } = await supabase
            .from('tasks')
            .select('description')
            .eq('id', selectedJob.task_id)
            .single();

        const oldDescription = taskData?.description || "";
        
        // Criamos um bloco de texto legível para não poluir o card com HTML/JSON
        const feedbackText = [
            "🚨 Ajuste Solicitado pelo Cliente:",
            `"${rejectReason}"`,
            "",
        ].join("\n");

        // Mandamos o card de volta para a coluna 'todo' (Briefing Recebido) e injetamos o feedback no topo
        await updateTaskStatus(selectedJob.task_id, "todo");
        await supabase.from('tasks').update({ 
            description: feedbackText + (oldDescription || "")
        }).eq('id', selectedJob.task_id);
    }

    if (approvalError) {
        toast.error("Erro ao enviar.", { id: "reject" });
    } else {
        toast.success("Ajuste solicitado! A Criação foi notificada.", { id: "reject" });
        const updatedJob = { ...selectedJob, status: 'changes_requested', general_notes: updatedNotes };
        setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
        setSelectedJob(updatedJob);
        setShowRejectModal(false);
        setRejectReason("");
    }
  };

  const handleSaveNote = async () => {
      if (!selectedJob || !noteInput.trim()) return;
      
      const newNote = { id: Date.now(), user: "Cliente", text: noteInput, date: new Date().toLocaleDateString('pt-BR') };
      const updatedNotes = [...(selectedJob.general_notes || []), newNote];
      
      await supabase.from('approvals').update({ general_notes: updatedNotes }).eq('id', selectedJob.id);
      
      const updatedJob = { ...selectedJob, general_notes: updatedNotes };
      setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
      setSelectedJob(updatedJob);
      setShowNoteModal(false);
      setNoteInput("");
  };

  const handleDeleteNote = async (noteId: number) => {
      if (!selectedJob) return;
      const updatedNotes = selectedJob.general_notes.filter((n: any) => n.id !== noteId);
      
      await supabase.from('approvals').update({ general_notes: updatedNotes }).eq('id', selectedJob.id);
      
      const updatedJob = { ...selectedJob, general_notes: updatedNotes };
      setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
      setSelectedJob(updatedJob);
  };

  const handleDeleteJob = async (id: string | number) => {
      if (!confirm("Excluir esta arte permanentemente?")) return;
      
      const { error } = await supabase.from('approvals').delete().eq('id', id);
      
      if (error) {
          toast.error("Erro ao excluir.");
      } else {
          toast.success("Aprovação removida.");
          setJobs(prev => prev.filter(job => job.id !== id));
          if (selectedJob?.id === id) setSelectedJob(null);
      }
  };

  const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do Portal copiado!");
  };

  const handleOpenInImageStudio = () => {
    if (!selectedJob?.task_id) {
      toast.error("Este item não possui task vinculada.");
      return;
    }
    if (selectedJob.type !== "image") {
      toast.error("Abertura automática no ImageStudio disponível apenas para imagem.");
      return;
    }
    setLocation(`/image-studio?task_id=${selectedJob.task_id}&approval_id=${selectedJob.id}&reopen=1`);
  };

  // ==========================================
  // UPLOAD DE ARQUIVOS PARA APROVAÇÃO
  // ==========================================
  const uploadMediaWithProgress = (
    storagePath: string,
    file: File,
    token: string,
    onProgress: (pct: number) => void
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/library/${storagePath}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Falha no upload (${xhr.status}): ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error("Erro de rede durante o upload."));
      xhr.onabort = () => reject(new Error("Upload cancelado."));
      xhr.send(file);
    });

  const handleUploadSubmit = async () => {
    if (!uploadFile) { toast.error("Selecione um arquivo."); return; }
    const tenant = uploadTenant || activeTenant;
    if (!tenant || tenant === "all") { toast.error("Selecione um cliente."); return; }

    const isVideo = uploadFile.type.startsWith("video/");
    const isImage = uploadFile.type.startsWith("image/");
    if (!isVideo && !isImage) { toast.error("Formato não suportado. Envie imagem ou vídeo."); return; }

    const ext = (uploadFile.name.split(".").pop() || (isVideo ? "mp4" : "png")).toLowerCase();
    const safeName = uploadFile.name
      .toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
    const storagePath = `${tenant}/${Date.now()}-${safeName}.${ext}`;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      await uploadMediaWithProgress(storagePath, uploadFile, token, setUploadProgress);

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/library/${storagePath}`;
      const title = uploadTitle.trim() || uploadFile.name;

      const { error: dbErr } = await supabase.from("approvals").insert({
        tenant_slug: tenant,
        type: isVideo ? "video" : "image",
        [isVideo ? "video_url" : "image_url"]: publicUrl,
        status: "pending",
        general_notes: [],
        pins: [],
        metadata: { title },
      });
      if (dbErr) throw dbErr;

      toast.success("Arquivo enviado para aprovação!");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadProgress(null);
      await fetchApprovalJobs();
    } catch (err: any) {
      toast.error(err?.message || "Erro no upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToLibrary = async () => {
  if (!selectedJob) return;

  if (selectedJob.status !== "approved") {
    toast.error("Só é possível salvar na Biblioteca após aprovação.");
    return;
  }

  const url = selectedJob.content_url;
  if (!url) {
    toast.error("Essa peça não tem URL para salvar.");
    return;
  }

  const safeTenant = selectedJob.client || (activeTenant && activeTenant !== "all" ? activeTenant : "");
  if (!safeTenant) {
    toast.error("Selecione um cliente antes de continuar.");
    return;
  }

  toast.loading("Salvando na Biblioteca...", { id: "save-lib" });

  const { error } = await supabase.from("library").insert([
    {
      tenant_slug: safeTenant,
      url,
      type: selectedJob.type || "image",
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("library insert error:", error);
    toast.error(error.message || "Erro ao salvar na Biblioteca.", { id: "save-lib" });
    return;
  }

  toast.success("Salvo na Biblioteca!", { id: "save-lib" });
};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-20">
  <div className="flex items-center gap-4">
    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
      A
    </div>
    <div>
      <h1 className="text-sm font-bold text-slate-900">Portal de Aprovação</h1>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        Client Gateway
      </p>
    </div>
    {dynamicClients.length > 1 ? (
      <div className="ml-6 flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
        <UserCheck className="w-4 h-4 text-slate-500" />
        <select
          className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
          value={activeClient}
          onChange={(e) => setActiveClient(e.target.value)}
        >
          {dynamicClients.map((c: any) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    ) : dynamicClients.length === 1 ? (
      <div className="ml-6 flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
        <UserCheck className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-bold text-slate-700">{dynamicClients[0]}</span>
      </div>
    ) : null}
  </div>

  <div className="flex items-center gap-3">
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
      <button
        onClick={() => setViewMode("desktop")}
        className={`px-4 py-1 text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-2 transition ${
          viewMode === "desktop"
            ? "bg-white text-slate-900 shadow-md"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Monitor className="w-3.5 h-3.5" /> Desktop
      </button>
      <button
        onClick={() => setViewMode("mobile")}
        className={`px-4 py-1 text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-2 transition ${
          viewMode === "mobile"
            ? "bg-white text-slate-900 shadow-md"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" /> Mobile
      </button>
    </div>

    <div className="h-6 w-px bg-slate-300 mx-2"></div>

    <button
      onClick={() => {
        setUploadFile(null);
        setUploadTitle("");
        setUploadTenant(activeTenant && activeTenant !== "all" ? activeTenant : (dynamicClients.find(c => c !== "Todos") || ""));
        setUploadProgress(null);
        setShowUploadModal(true);
      }}
      className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition"
      title="Enviar arquivo para aprovação"
    >
      <Upload className="w-5 h-5" />
    </button>

    <button
      onClick={handleShare}
      className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition"
      title="Link do Portal"
    >
      <Link className="w-5 h-5" />
    </button>

    {/* NOVO BOTÃO - SÓ APARECE QUANDO APPROVED */}
    {selectedJob?.status === "approved" && (
      <button
        onClick={handleSaveToLibrary}
        className="text-slate-400 hover:text-purple-600 p-2 rounded-full hover:bg-purple-50 transition"
        title="Salvar na Biblioteca"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    )}

    <button
      onClick={() => selectedJob && handleDeleteJob(selectedJob.id)}
      className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"
      title="Excluir"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  </div>
</header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
             <span className="text-xs font-bold text-slate-500 uppercase">Peças na Fila</span>
             <div className="text-[10px] font-bold border border-slate-300 px-2 py-0.5 rounded bg-white text-slate-600">{filteredJobs.length}</div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-300">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500 opacity-50" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Sincronizando Banco...</span>
                </div>
            ) : filteredJobs.length === 0 ? ( 
                <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3"><FileX className="w-10 h-10 opacity-10" />Nenhuma peça aguardando aprovação para esta marca.</div> 
            ) : (
                filteredJobs.map(job => (
                <div key={job.id} onClick={() => { setSelectedJob(job); setPins(job.pins || []); }} className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 relative ${selectedJob?.id === job.id ? 'bg-blue-50/50' : ''}`}>
                    {selectedJob?.id === job.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight truncate max-w-[150px]">{job.client}</span>
                        <div className="flex gap-1 items-center">
                            {job.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                            {job.status === 'changes_requested' && <XCircle className="w-3.5 h-3.5 text-orange-500" />}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                              className="ml-1 text-slate-300 hover:text-red-500"
                              title="Excluir peça"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 leading-snug mb-2 line-clamp-2">{job.title}</h3>
                    <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                        <div className="flex items-center gap-1">{job.type === 'image' ? <ImageIcon className="w-3 h-3"/> : <PenTool className="w-3 h-3"/>} <span>{job.version}</span></div>
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3"/><span>{job.date}</span></div>
                    </div>
                </div>
                ))
            )}
          </div>
        </aside>

        {/* MAIN STAGE */}
        <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          {selectedJob ? (
            <>
              {/* AREA DE CONTEUDO */}
              <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-200/30">
                      <DeviceFrame mode={viewMode} type={selectedJob.type}>
                          <div className="w-full h-full flex items-center justify-center">
                              {/* CAMINHO 1: IMAGEM (Com Pins de comentário) */}
                              {selectedJob.type === 'image' && (
                                  <ImageReviewer 
                                      item={selectedJob} 
                                      pins={pins} 
                                      onAddPin={async (p:any)=>{
                                          const newPins = [...pins, p];
                                          setPins(newPins);
                                          await supabase.from('approvals').update({ pins: newPins }).eq('id', selectedJob.id);
                                      }} 
                                      onDeletePin={async (id:any)=>{
                                          const newPins = pins.filter(p=>p.id!==id);
                                          setPins(newPins);
                                          await supabase.from('approvals').update({ pins: newPins }).eq('id', selectedJob.id);
                                      }} 
                                      viewMode={viewMode} 
                                  />
                              )}

                              {/* CAMINHO 2: VÍDEO */}
                              {selectedJob.type === 'video' && (
                                  <video src={selectedJob.content_url} controls autoPlay className="max-w-full max-h-full object-contain shadow-2xl bg-black" />
                              )}

                              {/* CAMINHO 3: TEXTO */}
                              {selectedJob.type === 'text' && (
                                  <TextReviewer item={selectedJob} viewMode={viewMode} />
                              )}
                              {selectedJob.type === 'planner' && (
                                  <PlannerReviewer item={selectedJob} viewMode={viewMode} />
                              )}
                          </div>
                      </DeviceFrame>
                  </div>
                  <NotesSidebar notes={selectedJob.general_notes || []} onOpenAdd={()=>setShowNoteModal(true)} onDelete={handleDeleteNote} />
              </div>

              {/* FOOTER APROVAÇÃO */}
              <div className="h-24 bg-white border-t border-slate-200 px-10 flex items-center justify-between shrink-0 shadow-2xl z-30">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Controle de Qualidade</span>
                    <div className="flex items-center gap-3">
                       {selectedJob.status === 'pending' && <span className="text-xs font-bold text-yellow-600 flex items-center gap-2 px-4 py-1.5 bg-yellow-50 rounded-full border border-yellow-200 shadow-sm"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Aguardando seu OK</span>}
                       {selectedJob.status === 'approved' && <span className="text-xs font-bold text-green-600 flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full border border-green-200"><CheckCircle2 className="w-4 h-4" /> Aprovado pelo Cliente</span>}
                       {selectedJob.status === 'changes_requested' && <span className="text-xs font-bold text-red-600 flex items-center gap-2 px-4 py-1.5 bg-red-50 rounded-full border border-red-200"><XCircle className="w-4 h-4" /> Ajuste Solicitado</span>}
                    </div>
                 </div>
                 {selectedJob.status === 'pending' && (
                     <div className="flex gap-4">
                        <Button onClick={() => setShowRejectModal(true)} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold h-12 px-6 rounded-xl">SOLICITAR AJUSTE</Button>
                        <Button onClick={handleApprove} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-10 rounded-xl shadow-lg shadow-blue-900/20 transition-transform hover:scale-105 active:scale-95">APROVAR AGORA</Button>
                     </div>
                 )}
                 {selectedJob.status === 'changes_requested' && selectedJob.type === 'image' && (
                     <div className="flex gap-4">
                        <Button onClick={handleOpenInImageStudio} className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-purple-900/20 transition-transform hover:scale-105 active:scale-95">
                          REABRIR NO IMAGE STUDIO
                        </Button>
                     </div>
                 )}
              </div>
            </>
          ) : ( <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4"><Layout className="w-20 h-20 opacity-5" /><p className="text-xs font-bold uppercase tracking-widest">Selecione uma peça na fila</p></div> )}
        </main>
      </div>

      {/* MODAL ADICIONAR NOTA */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Adicionar Comentário</h3>
                <textarea className="w-full border border-slate-200 rounded-xl p-4 text-sm h-40 focus:ring-2 focus:ring-blue-500 outline-none mb-6 resize-none" placeholder="O que você achou dessa peça?" value={noteInput} onChange={e => setNoteInput(e.target.value)}/>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-sm font-bold text-slate-400">Cancelar</button>
                    <Button onClick={handleSaveNote} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">Salvar</Button>
                </div>
            </div>
        </div>
      )}
      
      {/* MODAL SOLICITAR AJUSTE */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-[500px] border-t-8 border-red-500 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-red-600 mb-2">Solicitar Revisão</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Por favor, detalhe os pontos que precisam ser ajustados pela equipe criativa.</p>
                <textarea className="w-full border border-slate-200 rounded-xl p-4 text-sm h-40 focus:ring-2 focus:ring-red-500 outline-none mb-6 resize-none" placeholder="Ex: Aumentar o logo, trocar a foto principal..." value={rejectReason} onChange={e => setRejectReason(e.target.value)}/>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm font-bold text-slate-400">Cancelar</button>
                    <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8">Enviar para Agência</Button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL UPLOAD */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-120 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Enviar para Aprovação
              </h3>
              <button onClick={() => !isUploading && setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cliente */}
            {isAdminOrAll && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cliente</label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={uploadTenant}
                  onChange={e => setUploadTenant(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {Array.from(new Set(jobs.map(j => j.client).filter(Boolean))).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Título */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título (opcional)</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Banner Home - Versão 2"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
              />
            </div>

            {/* Arquivo */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Arquivo</label>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
              >
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-1">
                    {uploadFile.type.startsWith("video/") ? <Film className="w-8 h-8 text-blue-500" /> : <ImageIcon className="w-8 h-8 text-blue-500" />}
                    <span className="text-sm font-bold text-slate-700">{uploadFile.name}</span>
                    <span className="text-xs text-slate-400">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 opacity-40" />
                    <span className="text-sm font-medium">Clique para selecionar imagem ou vídeo</span>
                    <span className="text-xs text-slate-400">JPG, PNG, MP4, MOV, WEBM — até 5 GB</span>
                  </div>
                )}
              </button>
            </div>

            {/* Progresso */}
            {uploadProgress !== null && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Enviando...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => !isUploading && setShowUploadModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-400 disabled:opacity-50"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <Button
                onClick={handleUploadSubmit}
                disabled={isUploading || !uploadFile}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando {uploadProgress ?? 0}%</> : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* input hidden para upload */}
      <input ref={uploadInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
    </div>
  );
}

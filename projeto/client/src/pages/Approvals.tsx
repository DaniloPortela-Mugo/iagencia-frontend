import React, { useState, useRef, useEffect } from "react";
import { 
  CheckCircle2, XCircle, MessageSquare, ChevronLeft, 
  ChevronRight, ZoomIn, ZoomOut, History, Share2, 
  Download, Eye, MoreHorizontal, PenTool, Layout, 
  Smartphone, Monitor, ChevronDown, User, Clock, Filter, UserCheck,
  Edit2, Trash2, FileX, Link, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// --- MOCK DATA ---
const CLIENTS = ["Todos", "Varejo S.A.", "Moda Fashion", "Tech Solutions"];

const APPROVAL_QUEUE_INIT = [
  {
    id: 1,
    client: "Varejo S.A.",
    campaign: "Dia dos Pais",
    type: "image",
    platform: "instagram",
    title: "Post Instagram - Carrossel Capa",
    version: "V2",
    date: "27 Jan, 10:30",
    content_url: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=1600&auto=format&fit=crop",
    versions: ["V1", "V2"],
    status: "pending", 
    general_notes: [],
    audit_log: [{ action: "Upload V2", user: "Agência (Criação)", date: "27 Jan, 10:30" }]
  },
  {
    id: 2,
    client: "Moda Fashion",
    campaign: "Verão 2026",
    type: "text",
    platform: "email",
    title: "E-mail Marketing - Lançamento",
    version: "V1",
    date: "27 Jan, 14:00",
    content_text: `ASSUNTO: O Verão chegou mais cedo na Moda Fashion ☀️\n\nOlá, [Nome do Cliente]!\n\nSabe aquela peça que faltava no seu guarda-roupa? Ela acabou de chegar.\nNossa nova coleção "Brisa do Mar" traz tecidos leves, tons terrosos e a sofisticação que você merece.\n\n[BOTÃO] VEM VER A COLEÇÃO`,
    versions: ["V1"],
    status: "pending",
    general_notes: [
        { id: 101, user: "Julia (Redação)", text: "Atenção para o tom de voz no segundo parágrafo.", date: "Hoje, 14:05" }
    ],
    audit_log: [{ action: "Upload V1", user: "Agência (Redação)", date: "27 Jan, 14:00" }]
  }
];

// --- COMPONENTE: MOLDURA DE DISPOSITIVO (A MÁGICA) ---
const DeviceFrame = ({ children, mode, type }: { children: React.ReactNode, mode: 'desktop' | 'mobile', type: string }) => {
    if (mode === 'desktop') {
        return <div className="w-full h-full flex justify-center">{children}</div>;
    }

    return (
        <div className="flex justify-center h-full py-4 transition-all duration-500 ease-in-out">
            <div className="relative w-[375px] h-[667px] bg-black rounded-[40px] border-[8px] border-zinc-900 shadow-2xl overflow-hidden flex flex-col">
                {/* Notch / Status Bar */}
                <div className="h-7 bg-white w-full flex justify-between items-center px-6 text-[10px] font-bold text-black border-b border-gray-100 z-10 shrink-0">
                    <span>9:41</span>
                    <div className="flex gap-1"><div className="w-3 h-3 bg-black rounded-full opacity-20"></div><div className="w-3 h-3 bg-black rounded-full opacity-20"></div></div>
                </div>
                
                {/* Mockup Header (Contexto) */}
                {type === 'image' && (
                    <div className="h-10 bg-white flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
                        <div className="font-bold text-xs">Instagram</div>
                        <MoreHorizontal className="w-4 h-4 text-gray-400"/>
                    </div>
                )}
                {type === 'text' && (
                    <div className="h-12 bg-red-600 flex items-center px-4 text-white shrink-0">
                        <div className="font-bold text-sm">Gmail</div>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 bg-white overflow-y-auto scrollbar-hide relative">
                    {children}
                </div>

                {/* Home Indicator */}
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

  // Ajuste de classes baseado no modo de visualização
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
            {/* Popover de edição ajustado para não sair da tela no mobile */}
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
const TextReviewer = ({ item, onOpenGeneralNote, viewMode }: any) => {
  return (
    <div className={`flex gap-6 h-full ${viewMode === 'mobile' ? 'flex-col' : ''}`}>
      <div className={`flex-1 bg-white ${viewMode === 'desktop' ? 'border border-slate-200 shadow-sm rounded-lg p-10' : 'p-4'} overflow-y-auto max-h-[60vh] prose prose-slate max-w-none`}>
        <h1 className={`${viewMode === 'mobile' ? 'text-lg' : 'text-2xl'} font-bold text-slate-900 mb-4`}>{item.title}</h1>
        <div className={`whitespace-pre-wrap font-serif ${viewMode === 'mobile' ? 'text-sm' : 'text-lg'} leading-relaxed text-slate-700`}>{item.content_text}</div>
      </div>
      
      {viewMode === 'desktop' && (
          <div className="w-72 bg-slate-50 border-l border-slate-200 p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Comentários Gerais</h3>
            <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">JD</div>
                <span className="text-xs font-bold text-slate-700">Julia (Redação)</span>
              </div>
              <p className="text-xs text-slate-600">Atenção para o tom de voz no segundo parágrafo. Precisa ser mais "premium".</p>
            </div>
            <button onClick={onOpenGeneralNote} className="w-full text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Adicionar nota geral
            </button>
          </div>
      )}
    </div>
  );
};

// --- COMPONENTE: PAINEL DE NOTAS (SIDEBAR) ---
const NotesSidebar = ({ notes, onOpenAdd, onDelete, onEdit }: any) => {
    return (
        <div className="w-80 bg-slate-50 border-l border-slate-200 p-4 space-y-4 flex flex-col h-full shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Notas Gerais
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
                {notes.length === 0 ? ( <div className="text-center py-10 text-slate-400 text-xs italic">Nenhuma nota.</div> ) : (
                    notes.map((note: any) => (
                        <div key={note.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm group relative">
                            <div className="flex items-center gap-2 mb-2"><div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">{note.user.charAt(0)}</div><span className="text-xs font-bold text-slate-700">{note.user}</span><span className="text-[9px] text-slate-400 ml-auto">{note.date}</span></div>
                            <p className="text-xs text-slate-600 leading-relaxed">{note.text}</p>
                            <div className="flex gap-2 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(note)} className="text-[10px] text-slate-400 hover:text-blue-500 flex items-center gap-1"><Edit2 className="w-3 h-3"/> Editar</button>
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
  const [activeClient, setActiveClient] = useState("Todos");
  const [jobs, setJobs] = useState(APPROVAL_QUEUE_INIT);
  const [selectedJob, setSelectedJob] = useState<any>(APPROVAL_QUEUE_INIT[0]);
  const [pins, setPins] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop'); // NOVO: Controle de View
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filtro
  useEffect(() => {
      const filtered = activeClient === "Todos" ? jobs : jobs.filter(j => j.client === activeClient);
      if (filtered.length > 0) { setSelectedJob(filtered[0]); } else { setSelectedJob(null); }
      setPins([]);
  }, [activeClient]); 

  const filteredJobs = activeClient === "Todos" ? jobs : jobs.filter(j => j.client === activeClient);

  // Handlers
  const handleAddPin = (newPin: any) => setPins([...pins, newPin]);
  const handleDeletePin = (id: number) => setPins(pins.filter(p => p.id !== id));
  
  const handleOpenAddNote = () => { setNoteInput(""); setEditingNoteId(null); setShowNoteModal(true); };
  const handleSaveNote = () => {
      if (!noteInput.trim()) return;
      const now = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      const newNotes = [...(selectedJob.general_notes || [])];
      if (editingNoteId) { const idx = newNotes.findIndex(n => n.id === editingNoteId); if (idx >= 0) newNotes[idx] = { ...newNotes[idx], text: noteInput }; toast.success("Nota atualizada."); } 
      else { newNotes.push({ id: Date.now(), user: "Você (Cliente)", text: noteInput, date: `Hoje, ${now}` }); toast.success("Nota adicionada."); }
      const updatedJob = { ...selectedJob, general_notes: newNotes };
      setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
      setSelectedJob(updatedJob);
      setShowNoteModal(false);
  };
  const handleDeleteNote = (id: number) => { if(!confirm("Apagar nota?")) return; const newNotes = selectedJob.general_notes.filter((n:any) => n.id !== id); const updatedJob = { ...selectedJob, general_notes: newNotes }; setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j)); setSelectedJob(updatedJob); toast.success("Nota removida."); };
  const handleEditNote = (note: any) => { setNoteInput(note.text); setEditingNoteId(note.id); setShowNoteModal(true); };

  const handleApprove = () => {
    const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    const updatedJob = { ...selectedJob, status: 'approved', audit_log: [...selectedJob.audit_log, { action: "Aprovado", user: "Você (Cliente)", date: now }] };
    setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
    setSelectedJob(updatedJob);
    toast.success("Campanha Aprovada com Sucesso! 🚀", { description: "Equipe notificada. Produção iniciada." });
  };

  const confirmReject = () => {
      if (!rejectReason.trim()) { toast.warning("Descreva o ajuste necessário."); return; }
      const now = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      const nowStr = new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
      const rejectionNote = { id: Date.now(), user: "Solicitação de Ajuste", text: `[CRÍTICO] ${rejectReason}`, date: `Hoje, ${now}` };
      const updatedJob = { ...selectedJob, status: 'changes_requested', general_notes: [...(selectedJob.general_notes || []), rejectionNote], audit_log: [...selectedJob.audit_log, { action: "Solicitou Ajustes", user: "Você (Cliente)", date: nowStr }] };
      setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j));
      setSelectedJob(updatedJob);
      setShowRejectModal(false);
      setRejectReason("");
      toast.info("Solicitação enviada.", { description: "O job voltou para a fila da Criação." });
  };

  const handleShare = () => {
      const magicLink = `https://agencia-ia.com/share/${Math.random().toString(36).substring(7)}`;
      navigator.clipboard.writeText(magicLink);
      toast.success("Link Mágico copiado!", { description: "Qualquer pessoa com este link poderá visualizar (sem login)." });
  };

  const handleDownload = () => { toast.promise(new Promise(r => setTimeout(r, 1500)), { loading: 'Preparando arquivo...', success: 'Download iniciado!', error: 'Erro no download' }); };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <div><h1 className="text-sm font-bold text-slate-900">Portal de Aprovação</h1><p className="text-xs text-slate-500">Agência I.A.</p></div>
          <div className="ml-6 flex items-center gap-2 bg-slate-100 rounded-md px-3 py-1.5 border border-slate-200">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <select className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer" value={activeClient} onChange={(e) => setActiveClient(e.target.value)}>
                  {CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('desktop')} className={`px-3 py-1 text-xs font-bold rounded shadow-sm flex items-center gap-2 transition ${viewMode === 'desktop' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Monitor className="w-3 h-3"/> Desktop</button>
              <button onClick={() => setViewMode('mobile')} className={`px-3 py-1 text-xs font-bold rounded shadow-sm flex items-center gap-2 transition ${viewMode === 'mobile' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Smartphone className="w-3 h-3"/> Mobile</button>
           </div>
           <div className="h-6 w-px bg-slate-300 mx-2"></div>
           <button onClick={handleShare} className="text-slate-400 hover:text-slate-600 p-2 rounded hover:bg-slate-100 transition" title="Link Mágico"><Link className="w-5 h-5"/></button>
           <button onClick={handleDownload} className="text-slate-400 hover:text-slate-600 p-2 rounded hover:bg-slate-100 transition" title="Baixar Arquivo"><Download className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fila de Aprovação</h2>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{filteredJobs.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredJobs.length === 0 ? ( <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center"><FileX className="w-8 h-8 mb-2 opacity-50" />Nenhum job pendente.</div> ) : filteredJobs.map(job => (
              <div key={job.id} onClick={() => { setSelectedJob(job); setPins([]); }} className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${selectedJob?.id === job.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{job.client}</span>
                  <div className="flex gap-1">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{job.version}</span>
                      {job.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      {job.status === 'changes_requested' && <XCircle className="w-3 h-3 text-orange-500" />}
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight mb-2 line-clamp-2">{job.title}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">{job.type === 'image' ? <Layout className="w-3 h-3"/> : <PenTool className="w-3 h-3"/>}<span>{job.date}</span></div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN STAGE */}
        <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          {selectedJob ? (
            <>
              {/* TOOLBAR */}
              <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Versão:</span>
                    <div className="flex items-center gap-1">{selectedJob.versions.map((v:string) => (<button key={v} className={`px-3 py-1 rounded-full text-xs font-bold transition ${selectedJob.version === v ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}>{v}</button>))}</div>
                 </div>
                 {selectedJob.type === 'image' && (<div className="flex items-center gap-2 text-slate-400"><button className="hover:text-slate-700"><ZoomOut className="w-4 h-4"/></button><span className="text-xs font-mono">100%</span><button className="hover:text-slate-700"><ZoomIn className="w-4 h-4"/></button></div>)}
              </div>

              {/* AREA DE CONTEUDO + SIDEBAR NOTAS */}
              <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-100/50">
                     {/* WRAPPER DO SIMULADOR */}
                     <DeviceFrame mode={viewMode} type={selectedJob.type}>
                        <div className="w-full h-full shadow-sm">
                            {selectedJob.type === 'image' ? (
                              <ImageReviewer item={selectedJob} pins={pins} onAddPin={handleAddPin} onDeletePin={handleDeletePin} viewMode={viewMode} />
                            ) : (
                              <TextReviewer item={selectedJob} onOpenGeneralNote={handleOpenAddNote} viewMode={viewMode} />
                            )}
                        </div>
                     </DeviceFrame>
                  </div>
                  {/* SIDEBAR DE NOTAS */}
                  <NotesSidebar notes={selectedJob.general_notes || []} onOpenAdd={handleOpenAddNote} onEdit={handleEditNote} onDelete={handleDeleteNote} />
              </div>

              {/* FOOTER */}
              <div className="h-24 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
                 <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                       <span className="text-xs text-slate-400 font-bold uppercase">Status Atual</span>
                       {selectedJob.status === 'pending' && <span className="text-sm font-bold text-yellow-600 flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full border border-yellow-200"><span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Aguardando Aprovação</span>}
                       {selectedJob.status === 'approved' && <span className="text-sm font-bold text-green-600 flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-200"><CheckCircle2 className="w-4 h-4" /> Aprovado</span>}
                       {selectedJob.status === 'changes_requested' && <span className="text-sm font-bold text-orange-600 flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-200"><XCircle className="w-4 h-4" /> Em Ajuste</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-400 pl-1"><span className="flex items-center gap-1"><User className="w-3 h-3"/> {selectedJob.audit_log[selectedJob.audit_log.length - 1]?.user}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {selectedJob.audit_log[selectedJob.audit_log.length - 1]?.action} em {selectedJob.audit_log[selectedJob.audit_log.length - 1]?.date}</span></div>
                 </div>
                 {selectedJob.status === 'pending' && (
                     <div className="flex gap-4">
                        <Button onClick={() => setShowRejectModal(true)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold h-12 px-6"><XCircle className="w-5 h-5 mr-2" /> SOLICITAR AJUSTES</Button>
                        <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-500 text-white font-bold h-12 px-8 shadow-lg shadow-green-900/10"><CheckCircle2 className="w-5 h-5 mr-2" /> APROVAR CAMPANHA</Button>
                     </div>
                 )}
                 {selectedJob.status !== 'pending' && <div className="text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-4 py-2 rounded">Ciclo Encerrado</div>}
              </div>
            </>
          ) : ( <div className="flex-1 flex flex-col items-center justify-center text-slate-300"><Layout className="w-24 h-24 mb-4 opacity-20" /><p className="text-lg font-medium">Selecione um job ou mude o cliente.</p></div> )}
        </main>
      </div>

      {/* MODAL NOTA */}
      {showNoteModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"><div className="bg-white p-6 rounded-lg shadow-2xl w-96"><h3 className="text-sm font-bold text-slate-800 mb-2">{editingNoteId ? 'Editar Nota' : 'Adicionar Nota Geral'}</h3><textarea className="w-full border border-slate-300 rounded p-3 text-sm h-32 focus:outline-none focus:border-blue-500 mb-4 resize-none text-slate-700" placeholder="Escreva sua observação..." value={noteInput} onChange={e => setNoteInput(e.target.value)}/><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowNoteModal(false)} size="sm" className="text-slate-500">Cancelar</Button><Button onClick={handleSaveNote} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">Salvar</Button></div></div></div>)}
      {/* MODAL REJEITAR */}
      {showRejectModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"><div className="bg-white p-6 rounded-lg shadow-2xl w-[500px] border-l-4 border-red-500"><h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2"><XCircle className="w-5 h-5"/> Solicitar Ajustes</h3><p className="text-sm text-slate-500 mb-4">Descreva o que precisa ser alterado.</p><textarea className="w-full border border-slate-300 rounded p-3 text-sm h-32 focus:outline-none focus:border-red-500 mb-4 resize-none text-slate-700" placeholder="Ex: Alterar a cor do fundo..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus/><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowRejectModal(false)} className="text-slate-500">Cancelar</Button><Button onClick={confirmReject} className="bg-red-600 hover:bg-red-500 text-white font-bold">Enviar Solicitação</Button></div></div></div>)}
    </div>
  );
}

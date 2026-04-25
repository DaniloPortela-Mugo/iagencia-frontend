import React, { useEffect, useState } from "react";
import { Plus, Clock, Edit3, Trash2, User, FileText, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";

const KANBAN_COLUMNS = [
    { id: 'todo', label: 'Fila de Jobs (Briefing)', color: 'bg-zinc-500' },
    { id: 'doing', label: 'Na Pauta', color: 'bg-blue-500' },
    { id: 'review', label: 'Aprovação Interna', color: 'bg-orange-500' },
    { id: 'done', label: 'Finalizado', color: 'bg-green-500' }
];

const CLIENT_COLORS: Record<string, string> = {
    'mugo': 'bg-purple-600',
    'ssavon': 'bg-green-600',
    'voy': 'bg-teal-500',
    'espacolaser': 'bg-pink-600',
    'roover': 'bg-blue-600',
    'carolgraber': 'bg-orange-600'
};

interface KanbanBoardProps {
    isExpanded: boolean;
    onToggleExpand: () => void;
    tasks: any[];
    activeTask: any;
    onTaskSelect: (task: any) => void;
    onTaskDelete?: (id: number) => void;
    onTaskDrop?: (taskId: number, status: string) => void;
    onNewTaskClick?: (status: string) => void;
    onTaskEdit?: (task: any) => void;
}

export function KanbanBoard({
    isExpanded,
    tasks,
    activeTask,
    onTaskSelect,
    onTaskDelete,
    onTaskDrop,
    onNewTaskClick,
    onTaskEdit
}: KanbanBoardProps) {
    const [previewTask, setPreviewTask] = useState<any | null>(null);
    const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
    const [previewMediaType, setPreviewMediaType] = useState<"image" | "video" | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const getEditorLabel = (task: any) => {
        return task?.updated_by || task?.edited_by || task?.last_editor || task?.updatedBy || null;
    };

    const formatBriefingText = (briefing: any) => {
        if (!briefing) return "";
        if (typeof briefing === "string") return briefing;
        try {
            if (Array.isArray(briefing)) {
                return briefing.map((item, idx) => `• ${formatBriefingText(item) || `Item ${idx + 1}`}`).join("\n");
            }
            if (typeof briefing === "object") {
                return Object.entries(briefing)
                    .map(([key, value]) => {
                        const label = String(key).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                        const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
                        return `${label}:\n${text}`;
                    })
                    .join("\n\n");
            }
        } catch {
            return "";
        }
        return String(briefing);
    };

    useEffect(() => {
        let cancelled = false;
        const loadPreviewMedia = async () => {
            if (!previewTask?.id) {
                setPreviewMediaUrl(null);
                setPreviewMediaType(null);
                return;
            }
            setPreviewLoading(true);
            try {
                const { data } = await supabase
                    .from("approvals")
                    .select("image_url,video_url,created_at")
                    .eq("task_id", previewTask.id)
                    .order("created_at", { ascending: false })
                    .limit(1);
                if (cancelled) return;
                const hit = data?.[0];
                if (hit?.video_url) {
                    setPreviewMediaUrl(hit.video_url);
                    setPreviewMediaType("video");
                } else if (hit?.image_url) {
                    setPreviewMediaUrl(hit.image_url);
                    setPreviewMediaType("image");
                } else {
                    setPreviewMediaUrl(null);
                    setPreviewMediaType(null);
                }
            } catch {
                if (!cancelled) {
                    setPreviewMediaUrl(null);
                    setPreviewMediaType(null);
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        };
        loadPreviewMedia();
        return () => { cancelled = true; };
    }, [previewTask?.id]);

    const handleDragStart = (e: React.DragEvent, id: number) => {
        e.dataTransfer.setData("id", id.toString());
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className={`transition-all duration-500 ease-in-out bg-zinc-950 border-b border-zinc-800 px-6 overflow-x-auto shrink-0 ${isExpanded ? 'h-[280px] py-6 opacity-100' : 'h-0 opacity-0 p-0 border-0'}`}>
            <div className="flex gap-4 h-full min-w-max">
                {KANBAN_COLUMNS.map(col => (
                    <div 
                        key={col.id} 
                        className="w-72 flex flex-col bg-zinc-950/30 rounded-xl border border-zinc-800/50" 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => onTaskDrop?.(Number(e.dataTransfer.getData("id")), col.id)}
                    >
                        {/* CABEÇALHO DA COLUNA */}
                        <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">{col.label}</span>
                                <span className="text-[9px] bg-black px-2 py-0.5 rounded text-zinc-500 font-mono">
                                    {tasks.filter(t => t.status === col.id).length}
                                </span>
                            </div>
                            <button onClick={() => onNewTaskClick?.(col.id)} className="text-zinc-500 hover:text-white hover:bg-zinc-700 p-1 rounded transition">
                                <Plus className="w-3 h-3"/>
                            </button>
                        </div>
                        
                        {/* LISTA DE CARDS */}
                        <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                            {tasks.filter(t => t.status === col.id).map(task => (
                                <div 
                                    key={task.id} 
                                    draggable 
                                    onDragStart={(e) => handleDragStart(e, task.id)} 
                                    onClick={() => onTaskSelect(task)} 
                                    className={`group relative bg-zinc-900 hover:bg-zinc-800/80 border rounded-xl p-0 transition-all shadow-sm cursor-pointer overflow-hidden ${activeTask?.id === task.id ? 'ring-1 ring-blue-500 border-blue-500' : 'border-zinc-800 hover:border-zinc-600'}`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${CLIENT_COLORS[task.tenant || task.client] || 'bg-zinc-600'}`}></div>
                                    <div className="pl-4 p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                                                {task.tenant || task.client || "Geral"}
                                            </span>
                                            <div className="flex -space-x-2">
                                                {task.assignees?.length ? task.assignees.map((id:string) => (
                                                     <div key={id} className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold border border-zinc-900" title={id}>
                                                         {id.charAt(0).toUpperCase()}
                                                     </div>
                                                )) : (
                                                    <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                                        <User className="w-3 h-3 text-zinc-600" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs font-semibold text-gray-200 mb-2 leading-snug">{task.title}</p>
                                        
                                        {task.formats?.length ? (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {task.formats.map((fmt:string, idx:number) => (
                                                    <span key={`${fmt}-${idx}`} className="flex items-center gap-1 text-[9px] font-medium bg-zinc-950 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                                        {fmt}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                        
                                        <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3 mt-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPreviewTask(task); }} 
                                                className="text-[10px] font-bold bg-zinc-800 text-zinc-300 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                            >
                                                Ver Material <ChevronRight className="w-3 h-3"/>
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    {onTaskEdit && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onTaskEdit(task); }} 
                                                            className="p-1 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded transition-colors z-10" 
                                                            title="Editar Job"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onTaskDelete?.(task.id); }} 
                                                        className="p-1 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded transition-colors z-10" 
                                                        title="Excluir Job"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {getEditorLabel(task) && (
                                            <div className="mt-2 text-[9px] text-zinc-500">
                                                Editado por <span className="text-zinc-300 font-semibold">{getEditorLabel(task)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            <button onClick={() => onNewTaskClick?.(col.id)} className="w-full py-2 border border-dashed border-zinc-800 rounded-lg text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50 transition flex items-center justify-center gap-2">
                                <Plus className="w-3 h-3"/> Novo Job
                            </button>
                            
                            {tasks.filter(t => t.status === col.id).length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 py-4 opacity-50">
                                    <FileText className="w-6 h-6 mb-2" />
                                    <p className="text-[10px]">Coluna vazia</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        {previewTask && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-[680px] max-w-[90vw] max-h-[90vh] overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{previewTask.tenant || previewTask.client || "Geral"}</p>
                            <h3 className="text-lg font-bold text-white">{previewTask.title || "Job"}</h3>
                        </div>
                        <button
                            onClick={() => setPreviewTask(null)}
                            className="text-zinc-400 hover:text-white text-xs font-bold"
                        >
                            Fechar
                        </button>
                    </div>
                    <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                        <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400">
                            <div><span className="text-zinc-600">Departamento:</span> {previewTask.department || "-"}</div>
                            <div><span className="text-zinc-600">Status:</span> {previewTask.status || "-"}</div>
                            <div><span className="text-zinc-600">Criado por:</span> {previewTask.created_by || "-"}</div>
                            <div><span className="text-zinc-600">Atualizado por:</span> {getEditorLabel(previewTask) || "-"}</div>
                        </div>

                        {previewTask.formats?.length ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Formatos</p>
                                <div className="flex flex-wrap gap-2">
                                    {previewTask.formats.map((fmt: string, idx: number) => (
                                        <span key={`${fmt}-${idx}`} className="text-[10px] px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                            {fmt}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {previewTask.assignees?.length ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Responsáveis</p>
                                <div className="flex flex-wrap gap-2">
                                    {previewTask.assignees.map((id: string) => (
                                        <span key={id} className="text-[10px] px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                            {id}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {previewTask.description ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Descrição</p>
                                {String(previewTask.description).includes("<") ? (
                                    <div
                                        className="prose prose-invert text-xs max-w-none"
                                        dangerouslySetInnerHTML={{ __html: previewTask.description }}
                                    />
                                ) : (
                                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{previewTask.description}</p>
                                )}
                            </div>
                        ) : null}

                        {previewTask.briefing_data ? (
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Briefing</p>
                                <div className="text-[12px] text-zinc-200 bg-zinc-900 border border-zinc-800 rounded p-3 whitespace-pre-wrap leading-relaxed">
                                    {formatBriefingText(previewTask.briefing_data)}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        )}
    </div>
    );
}

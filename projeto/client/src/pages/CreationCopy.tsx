import React, { useState, useEffect, useRef } from "react";
import { 
  PenTool, FileText, Settings2, Eraser, Wand2, Save, 
  MonitorPlay, Loader2, Copy, FileCode, Megaphone,
  Briefcase, Clock, Tv, Layout, ChevronUp, ChevronDown,
  MoreVertical, CalendarClock, User, Eye, Edit3, 
  Plus, X, Send, Sparkles, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = "http://localhost:8000";

// --- DADOS INICIAIS ---
const INITIAL_JOBS = [
    { id: 1, status: 'todo', client: 'Varejo S.A.', subClient: 'Campanha Pais', format: 'Roteiro TV (Filme Publicitário)', title: 'Campanha Dia dos Pais', duration: '30', topic: 'Emocional, focado na conexão pai e filho.', tone: 'Emocional', framework: 'Storytelling', target: 'Famílias', deadline: 'Hoje' },
    { id: 2, status: 'doing', client: 'Moda Fashion', subClient: 'Verão 2026', format: 'Post Instagram/LinkedIn', title: 'Aprovação KV Verão', duration: '', topic: 'Lançamento coleção praia.', tone: 'Descontraído', framework: 'AIDA', target: 'Mulheres 20-35', deadline: '2 dias' }
];

const CLIENTES = ["Varejo S.A.", "Moda Fashion", "Burger King", "Tech Solutions", "Local"];
const FORMATOS = ["Post Instagram/LinkedIn", "Roteiro TV (Filme Publicitário)", "Roteiro Rádio (Spot)", "Email Marketing", "Artigo de Blog"];
const TONS = ["Profissional", "Varejo/Urgente", "Emocional", "Descontraído", "Polêmico", "Sofisticado"];
const FRAMEWORKS = [ { label: "Livre / Geral", value: "Livre" }, { label: "AIDA", value: "AIDA" }, { label: "PAS", value: "PAS" }, { label: "Storytelling", value: "Storytelling" } ];

// --- COMPONENTE: EDITOR INTELIGENTE DE TABELA ---
const ScriptTableEditor = ({ markdown, onChange }: { markdown: string, onChange: (val: string) => void }) => {
    const [rows, setRows] = useState<string[][]>([]);
    const [header, setHeader] = useState<string[]>([]);

    useEffect(() => {
        const lines = markdown.split('\n').filter(l => l.trim().startsWith('|'));
        if (lines.length > 2) {
            const head = lines[0].split('|').map(c => c.trim()).filter(c => c);
            const body = lines.slice(2).map(line => line.split('|').map(c => c.trim()).filter(c => c));
            setHeader(head);
            setRows(body);
        }
    }, [markdown]);

    const updateRow = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...rows];
        newRows[rowIndex][colIndex] = value;
        setRows(newRows);
        // Reconstrói a string Markdown
        let md = `| ${header.join(' | ')} |\n| ${header.map(() => ':---').join(' | ')} |\n`;
        newRows.forEach(row => { md += `| ${row.join(' | ')} |\n`; });
        onChange(md);
    };

    if (rows.length === 0) return <textarea className="w-full h-full bg-transparent p-4 font-mono text-sm text-gray-300 outline-none" value={markdown} onChange={e => onChange(e.target.value)} />;

    return (
        <div className="space-y-3 p-4">
            {rows.map((row, rIdx) => (
                <div key={rIdx} className="grid gap-3 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 transition-colors hover:border-zinc-700" style={{ gridTemplateColumns: `80px 1fr 1fr` }}>
                    {row.map((cell, cIdx) => (
                        <div key={cIdx} className="flex flex-col">
                            <label className="text-[10px] text-blue-400/70 uppercase mb-1.5 font-bold tracking-wider">{header[cIdx] || `Col ${cIdx}`}</label>
                            <textarea 
                                className="bg-black/50 border border-zinc-700/50 rounded-md p-2 text-xs text-zinc-300 focus:border-blue-500 focus:bg-black outline-none resize-none min-h-[80px] leading-relaxed transition-all"
                                value={cell.replace(/<br>/g, '\n')} 
                                onChange={(e) => updateRow(rIdx, cIdx, e.target.value.replace(/\n/g, '<br>'))} 
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default function CreationCopy() {
  // State Layout
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // State Dados
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  // Inputs
  const [client, setClient] = useState("");
  const [subClient, setSubClient] = useState("");
  const [format, setFormat] = useState("Post Instagram/LinkedIn");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Profissional");
  const [framework, setFramework] = useState("Livre");
  const [target, setTarget] = useState("");
  
  // Output & Chat
  const [generatedText, setGeneratedText] = useState(""); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string, agent?: string}[]>([
      { role: 'ai', text: "Olá! Sou o Agente C4 (Editor). Assim que você gerar um texto, estarei aqui para ajudar a refinar.", agent: "C4" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isScriptMode = format.includes("Roteiro") || format.includes("TV") || format.includes("Rádio");

  // --- KANBAN LOGIC ---
  const handleAddJob = () => {
      const newJob = { id: Date.now(), status: 'todo', client: 'Novo Cliente', subClient: '', format: 'Post Instagram/LinkedIn', title: 'Nova Tarefa', duration: '', topic: '', tone: 'Profissional', framework: 'Livre', target: '', deadline: 'Hoje' };
      // @ts-ignore
      setJobs([...jobs, newJob]); handleSelectJob(newJob); toast.success("Nova tarefa criada!");
  };
  const handleDeleteJob = (e: any, id: number) => {
      e.stopPropagation(); if(confirm("Excluir tarefa?")) { setJobs(jobs.filter(j => j.id !== id)); if(activeJobId === id) handleClear(); }
  };
  const handleMoveJob = (e: any, job: any) => {
      e.stopPropagation();
      const nextStatus = job.status === 'todo' ? 'doing' : job.status === 'doing' ? 'done' : 'todo';
      setJobs(jobs.map(j => j.id === job.id ? {...j, status: nextStatus} : j));
  };
  const handleSelectJob = (job: any) => {
      setClient(job.client); setSubClient(job.subClient); setFormat(job.format); setTitle(job.title); setDuration(job.duration || "30"); setTopic(job.topic); setTone(job.tone); setFramework(job.framework); setTarget(job.target);
      setActiveJobId(job.id); setIsKanbanExpanded(false);
  };
  const handleClear = () => { setActiveJobId(null); setTopic(""); setGeneratedText(""); setTitle(""); toast.info("Limpo."); };

  // --- GENERATION ---
  const handleGenerate = async () => {
    if (!client || !topic) { toast.warning("Preencha o briefing."); return; }
    setIsProcessing(true);
    try {
      const payload = { format, client, sub_client: subClient, title, duration, topic, tone, framework, target_audience: target };
      const res = await fetch(`${API_URL}/creation/generate-copy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Erro API");
      const data = await res.json();
      setGeneratedText(data.prompt_pt); setIsEditing(false);
      setChatMessages(prev => [...prev, { role: 'ai', text: "Rascunho gerado! Se precisar de ajustes ou novas ideias, é só pedir aqui.", agent: isScriptMode ? "C3" : "C1" }]);
      toast.success("Brainstorm Gerado!");
    } catch (e) { toast.error("Erro ao gerar."); } finally { setIsProcessing(false); }
  };

  // --- CHAT ---
  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput; setChatInput("");
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setTimeout(async () => {
          try {
            const res = await fetch(`${API_URL}/creation/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_text: generatedText, user_message: userMsg, active_agent: "C4" }) });
            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'ai', text: data.message, agent: data.agent }]);
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
          } catch (e) { setChatMessages(prev => [...prev, { role: 'ai', text: "Erro ao conectar com o agente.", agent: "System" }]); }
      }, 800);
  };

  // Helpers de Texto
  const splitContent = () => {
      if (!isScriptMode) return { header: "", table: generatedText };
      const parts = generatedText.split('| TEMPO');
      return { header: parts[0], table: parts.length > 1 ? '| TEMPO' + parts[1] : '' };
  };
  const handleTableUpdate = (newTable: string) => { const { header } = splitContent(); setGeneratedText(header + newTable); };

  // --- RENDER ---
  const KanbanCard = ({ job }: { job: any }) => (
      <div onClick={() => handleSelectJob(job)} className={`bg-zinc-900 border border-zinc-800 p-3 rounded-lg cursor-pointer hover:border-zinc-600 transition-all group relative mb-2 ${activeJobId === job.id ? 'ring-1 ring-blue-500 bg-blue-950/10' : ''}`}>
          <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-zinc-800 text-zinc-400">{job.client}</span>
              <div className="flex gap-1">
                  <button onClick={(e) => handleMoveJob(e, job)} className={`w-2 h-2 rounded-full ${job.status === 'todo' ? 'bg-zinc-600' : job.status === 'doing' ? 'bg-blue-500' : 'bg-green-500'} hover:scale-125 transition`} title="Mudar Status"></button>
                  <button onClick={(e) => handleDeleteJob(e, job.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
              </div>
          </div>
          <h4 className="text-xs font-bold text-zinc-200 mb-1 leading-snug">{job.title}</h4>
      </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col h-screen overflow-hidden">
      
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-black shrink-0 z-20">
        <div className="flex items-center gap-3"><div className="bg-blue-900/30 p-1.5 rounded-lg"><PenTool className="w-5 h-5 text-blue-500" /></div><div><h1 className="text-sm font-bold text-zinc-100">Redação & Roteiro</h1></div></div>
        <div className="flex items-center gap-3"><button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 transition-all"><Layout className="w-3 h-3" /> {isKanbanExpanded ? "Recolher" : "Jobs"} {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button><div className="h-6 w-px bg-zinc-800 mx-1"></div><div className="bg-zinc-900 px-3 py-1 rounded text-[10px] text-zinc-500 border border-zinc-800 flex items-center gap-2">{isScriptMode ? <Tv className="w-3 h-3 text-yellow-500" /> : <FileText className="w-3 h-3" />} {isScriptMode ? "Agente C3 (Roteiro)" : "Agente C1 (Copy)"}</div></div>
      </header>

      {/* KANBAN (TOP) */}
      <div className={`border-b border-zinc-800 bg-black transition-all duration-300 ease-in-out overflow-hidden ${isKanbanExpanded ? 'h-[220px]' : 'h-0 opacity-0'}`}>
          <div className="h-full grid grid-cols-3 gap-0 divide-x divide-zinc-800">
              <div className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-zinc-500 uppercase">Pendente</h3><button onClick={handleAddJob} className="text-zinc-500 hover:text-blue-400"><Plus className="w-3 h-3" /></button></div>{jobs.filter(j => j.status === 'todo').map(job => <KanbanCard key={job.id} job={job} />)}</div>
              <div className="p-4 overflow-y-auto bg-zinc-950/30 scrollbar-thin scrollbar-thumb-zinc-800"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-blue-500 uppercase">Em Andamento</h3></div>{jobs.filter(j => j.status === 'doing').map(job => <KanbanCard key={job.id} job={job} />)}</div>
              <div className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-green-600 uppercase">Aprovação</h3></div>{jobs.filter(j => j.status === 'done').map(job => <KanbanCard key={job.id} job={job} />)}</div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* INPUTS (LEFT) */}
        <div className="w-[380px] border-r border-zinc-800 overflow-y-auto p-5 space-y-5 bg-zinc-950/50 scrollbar-thin scrollbar-thumb-zinc-800">
           <div className="flex justify-between items-center"><h2 className="text-xs text-blue-400 font-bold uppercase flex items-center gap-2"><Briefcase className="w-3 h-3" /> Job Atual</h2><button onClick={handleClear} className="text-zinc-600 hover:text-white" title="Limpar"><Eraser className="w-4 h-4" /></button></div>
           <div className="space-y-3">
              <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Cliente</label><select className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500" value={client} onChange={e => setClient(e.target.value)}><option value="">Selecione...</option>{CLIENTES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Formato</label><select className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500" value={format} onChange={e => setFormat(e.target.value)}>{FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              {isScriptMode && (<div className="grid grid-cols-3 gap-2"><div className="col-span-2"><label className="text-[10px] text-yellow-600 uppercase block mb-1">Título</label><input className="w-full bg-black border border-yellow-900/50 rounded p-2 text-xs text-white outline-none focus:border-yellow-500" value={title} onChange={e => setTitle(e.target.value)} /></div><div><label className="text-[10px] text-yellow-600 uppercase block mb-1">Tempo</label><input className="w-full bg-black border border-yellow-900/50 rounded p-2 text-xs text-white outline-none focus:border-yellow-500" value={duration} onChange={e => setDuration(e.target.value)} /></div></div>)}
              <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Briefing</label><textarea className="w-full bg-black border border-zinc-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500 min-h-[100px]" value={topic} onChange={e => setTopic(e.target.value)}/></div>
           </div>
           <div className="pt-4"><Button onClick={handleGenerate} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg text-xs gap-2">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} CRIAR AGORA</Button></div>
           <div className="h-10"></div>
        </div>

        {/* OUTPUT + CHAT (RIGHT) */}
        <div className="flex-1 flex flex-col bg-black relative">
           
           {/* UPPER: VISUALIZER / EDITOR */}
           <div className="flex-1 overflow-hidden flex flex-col p-6 pb-0">
               <div className="flex items-center justify-between mb-2 shrink-0">
                   <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${isEditing ? 'bg-yellow-500' : 'bg-green-500'}`}></span> {isEditing ? "Editando" : "Visualização"}</h3>
                   <div className="flex gap-2"><button className={`px-3 py-1 text-xs rounded flex items-center gap-2 transition ${!isEditing ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`} onClick={() => setIsEditing(false)}><Eye className="w-3 h-3"/> Ler</button><button className={`px-3 py-1 text-xs rounded flex items-center gap-2 transition ${isEditing ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`} onClick={() => setIsEditing(true)}><Edit3 className="w-3 h-3"/> Editar</button><button className="px-3 py-1 text-xs rounded flex items-center gap-2 text-zinc-500 hover:text-white ml-2" onClick={() => {navigator.clipboard.writeText(generatedText); toast.success("Copiado!");}}><Copy className="w-3 h-3"/> Copiar</button></div>
               </div>

               <div className="bg-zinc-900/50 border border-zinc-700 rounded-t-xl flex-1 relative overflow-hidden flex flex-col">
                   {generatedText ? (
                       isEditing && isScriptMode ? (
                           // MODO EDIÇÃO INTELIGENTE DE TABELA
                           <div className="w-full h-full overflow-y-auto">
                               <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 mb-2"><pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap">{splitContent().header}</pre></div>
                               <ScriptTableEditor markdown={splitContent().table} onChange={handleTableUpdate} />
                           </div>
                       ) : isEditing ? (
                           // MODO EDIÇÃO TEXTO PURO
                           <textarea className="w-full h-full bg-transparent p-8 font-mono text-sm text-gray-300 leading-relaxed focus:outline-none resize-none" value={generatedText} onChange={(e) => setGeneratedText(e.target.value)} />
                       ) : (
                           // MODO VISUALIZAÇÃO
                           <div className="w-full h-full overflow-y-auto p-8 prose prose-invert prose-sm max-w-none text-gray-300 scrollbar-thin scrollbar-thumb-zinc-700">
                               <style>{`table { width: 100%; border-collapse: collapse; } th { background: #18181b; padding: 10px; border: 1px solid #3f3f46; font-size: 0.75rem; text-transform: uppercase; color: #a1a1aa; } td { padding: 12px; border: 1px solid #3f3f46; vertical-align: top; font-size: 0.9rem; line-height: 1.6; } tr:nth-child(even) { background: rgba(255,255,255,0.02); }`}</style>
                               <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedText}</ReactMarkdown>
                           </div>
                       )
                   ) : (
                       <div className="h-full flex flex-col items-center justify-center text-zinc-700"><Megaphone className="w-12 h-12 mb-3 opacity-20" /><p className="text-sm">Aguardando briefing...</p></div>
                   )}
               </div>
           </div>

           {/* LOWER: CHAT (CO-PILOTO) */}
           <div className="h-[250px] bg-zinc-950 border-t border-zinc-800 flex flex-col shrink-0">
               <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50"><Sparkles className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Co-piloto Criativo</span></div>
               <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
                   {chatMessages.map((msg, idx) => (
                       <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-purple-900/50 text-purple-400' : 'bg-zinc-700 text-zinc-300'}`}>{msg.role === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}</div>
                           <div className={`max-w-[80%] rounded-lg p-3 text-xs leading-relaxed ${msg.role === 'ai' ? 'bg-zinc-900 text-zinc-300 border border-zinc-800' : 'bg-blue-900/30 text-blue-100 border border-blue-800'}`}>
                               {msg.agent && <span className="block text-[9px] font-bold text-purple-500 mb-1 uppercase">{msg.agent} diz:</span>}{msg.text}
                           </div>
                       </div>
                   ))}
                   <div ref={chatEndRef} />
               </div>
               <div className="p-3 border-t border-zinc-800 bg-black flex gap-2">
                   <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none placeholder:text-zinc-600" placeholder="Converse com a IA..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                   <button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition"><Send className="w-4 h-4" /></button>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { 
  Briefcase, Layout, ChevronUp, ChevronDown, Plus, MoreVertical, 
  CalendarClock, User, FileText, Sparkles, Send, Save, ArrowRightCircle,
  Users, CheckCircle2, CircleDashed, Eraser, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = "http://localhost:8000";

// --- DADOS MOCKADOS (Kanban Atendimento) ---
const INITIAL_JOBS = [
    { id: 1, status: 'briefing', client: 'Varejo S.A.', campaign: 'Dia dos Pais', date: 'Hoje', owner: 'Eu' },
    { id: 2, status: 'planning', client: 'Moda Fashion', campaign: 'Verão 2026', date: 'Ontem', owner: 'Ana' },
    { id: 3, status: 'production', client: 'Burger King', campaign: 'Lançamento Whopper', date: '2 dias', owner: 'Julia' },
];

const EQUIPE = [
    { id: 'plan', label: 'Planejamento', people: ['Ana (Estrategista)', 'Carlos (Dados)'] },
    { id: 'copy', label: 'Redação (Criação)', people: ['Julia (Redatora)', 'Lucas (Roteirista)'] },
    { id: 'art', label: 'Direção de Arte (Criação)', people: ['Marcos (DA)', 'Sofia (Designer)'] },
    { id: 'media', label: 'Mídia', people: ['Roberto (Performance)'] }
];

export default function Atendimento() {
  // Layout
  const [isKanbanExpanded, setIsKanbanExpanded] = useState(true);
  
  // Dados do Kanban
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  // Formulário
  const [clientName, setClientName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [generatedBriefing, setGeneratedBriefing] = useState(""); // O Briefing Formatado
  
  // Envio
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  
  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input'); // Controla se estamos digitando ou revisando

  // --- AÇÕES ---
  const handleSelectJob = (job: any) => {
      setClientName(job.client);
      setCampaignName(job.campaign);
      setActiveJobId(job.id);
      setIsKanbanExpanded(false); // Foca no trabalho
      toast.success(`Job "${job.campaign}" selecionado.`);
  };

  const handleGenerateBriefing = async () => {
      if (!rawDescription || !clientName) { toast.warning("Preencha o cliente e a descrição."); return; }
      
      setIsProcessing(true);
      try {
          const res = await fetch(`${API_URL}/atendimento/generate-briefing`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ client: clientName, campaign: campaignName, raw_description: rawDescription })
          });
          const data = await res.json();
          setGeneratedBriefing(data.briefing_pt);
          setStep('review'); // Muda para a tela de revisão
          toast.success("Briefing estruturado com sucesso!");
      } catch (e) {
          toast.error("Erro ao gerar briefing.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSendJob = () => {
      if (!selectedSector || !selectedPerson) { toast.warning("Selecione para quem enviar."); return; }
      
      toast.success(`Briefing enviado para ${selectedPerson} (${selectedSector})!`);
      
      // Atualiza status no Kanban
      if (activeJobId) {
          setJobs(jobs.map(j => j.id === activeJobId ? {...j, status: 'planning'} : j));
      }
      
      // Reseta
      setStep('input');
      setGeneratedBriefing("");
      setRawDescription("");
      setActiveJobId(null);
      setIsKanbanExpanded(true);
  };

  const KanbanCard = ({ job }: { job: any }) => (
      <div onClick={() => handleSelectJob(job)} className={`bg-zinc-900 border border-zinc-800 p-3 rounded-lg cursor-pointer hover:border-blue-500/50 transition-all group mb-2 ${activeJobId === job.id ? 'ring-1 ring-blue-500 bg-blue-950/10' : ''}`}>
          <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-zinc-800 text-zinc-400">{job.client}</span>
              <MoreVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
          </div>
          <h4 className="text-sm font-bold text-zinc-200 mb-1 leading-snug">{job.campaign}</h4>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800/50">
              <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {job.date}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {job.owner}</span>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-black shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Briefcase className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-sm font-bold text-zinc-100">Gestão de Atendimento</h1></div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsKanbanExpanded(!isKanbanExpanded)} className="text-xs flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 transition-all">
                <Layout className="w-3 h-3" /> {isKanbanExpanded ? "Recolher Fluxo" : "Ver Fluxo"} {isKanbanExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <div className="h-6 w-px bg-zinc-800 mx-1"></div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-bold flex items-center gap-2 transition">
                <Plus className="w-3 h-3" /> Nova Demanda
            </button>
        </div>
      </header>

      {/* KANBAN */}
      <div className={`border-b border-zinc-800 bg-black transition-all duration-300 ease-in-out overflow-hidden ${isKanbanExpanded ? 'h-[240px]' : 'h-0 opacity-0'}`}>
          <div className="h-full grid grid-cols-3 gap-0 divide-x divide-zinc-800">
              <div className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-zinc-500 uppercase">Briefing / Entrada</h3><span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 rounded">{jobs.filter(j => j.status === 'briefing').length}</span></div>
                  {jobs.filter(j => j.status === 'briefing').map(job => <KanbanCard key={job.id} job={job} />)}
              </div>
              <div className="p-4 overflow-y-auto bg-zinc-950/30 scrollbar-thin scrollbar-thumb-zinc-800">
                  <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-blue-500 uppercase">Em Planejamento</h3><span className="bg-blue-900/20 text-blue-400 text-[10px] px-1.5 rounded">{jobs.filter(j => j.status === 'planning').length}</span></div>
                  {jobs.filter(j => j.status === 'planning').map(job => <KanbanCard key={job.id} job={job} />)}
              </div>
              <div className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  <div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-purple-500 uppercase">Em Criação</h3><span className="bg-purple-900/20 text-purple-400 text-[10px] px-1.5 rounded">{jobs.filter(j => j.status === 'production').length}</span></div>
                  {jobs.filter(j => j.status === 'production').map(job => <KanbanCard key={job.id} job={job} />)}
              </div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* --- COLUNA ESQUERDA: DADOS DO PEDIDO --- */}
        <div className="w-[400px] border-r border-zinc-800 overflow-y-auto p-6 space-y-6 bg-zinc-950/50 scrollbar-thin scrollbar-thumb-zinc-800">
           <div className="flex justify-between items-center">
               <h2 className="text-xs text-blue-400 font-bold uppercase flex items-center gap-2"><FileText className="w-3 h-3" /> Dados do Pedido</h2>
               <button onClick={() => {setRawDescription(""); setActiveJobId(null); setStep('input');}} className="text-zinc-600 hover:text-white" title="Limpar"><Eraser className="w-4 h-4" /></button>
           </div>

           <section className="space-y-4">
              <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Cliente</label>
                  <input className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Coca-Cola" />
              </div>
              <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Nome da Campanha / Job</label>
                  <input className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Natal 2026" />
              </div>
              
              <div className="pt-2">
                  <label className="text-[10px] text-blue-400 uppercase mb-2 block flex items-center gap-2"><Sparkles className="w-3 h-3" /> Descrição do Pedido (Caos)</label>
                  <textarea 
                    className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-sm text-white focus:border-blue-500 focus:outline-none min-h-[200px] leading-relaxed resize-none" 
                    placeholder="Cole aqui o email do cliente, as anotações da reunião ou o áudio transcrito. Não se preocupe com formatação, o Agente A1 vai organizar."
                    value={rawDescription} 
                    onChange={e => setRawDescription(e.target.value)}
                    disabled={step === 'review'}
                  />
              </div>

              {step === 'input' && (
                  <Button onClick={handleGenerateBriefing} disabled={isProcessing} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg text-xs gap-2">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
                      GERAR BRIEFING COM IA
                  </Button>
              )}
              
              {step === 'review' && (
                  <div className="bg-green-900/10 border border-green-900/30 p-3 rounded text-center">
                      <p className="text-xs text-green-400 mb-2">Briefing gerado com sucesso!</p>
                      <button onClick={() => setStep('input')} className="text-[10px] text-zinc-500 hover:text-white underline">Voltar para editar pedido original</button>
                  </div>
              )}
           </section>
        </div>

        {/* --- COLUNA DIREITA: BRIEFING FORMATADO & ENVIO --- */}
        <div className="flex-1 flex flex-col bg-black">
           
           {/* ÁREA DE VISUALIZAÇÃO/EDIÇÃO DO BRIEFING */}
           <div className="flex-1 overflow-hidden flex flex-col p-6 pb-0">
               <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${step === 'review' ? 'bg-green-500' : 'bg-zinc-700'}`}></span> 
                       {step === 'review' ? "Briefing Estruturado (Agente A1)" : "Aguardando geração..."}
                   </h3>
               </div>

               <div className="bg-zinc-900/50 border border-zinc-700 rounded-t-xl flex-1 relative overflow-hidden flex flex-col">
                   {step === 'review' ? (
                       <textarea 
                           className="w-full h-full bg-transparent p-8 font-mono text-sm text-gray-300 leading-relaxed focus:outline-none resize-none" 
                           value={generatedBriefing}
                           onChange={(e) => setGeneratedBriefing(e.target.value)}
                       />
                   ) : (
                       <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                           <Layout className="w-16 h-16 mb-4 opacity-10" />
                           <p className="text-sm max-w-xs text-center">Preencha o pedido à esquerda e peça para a IA organizar o briefing.</p>
                       </div>
                   )}
               </div>
           </div>

           {/* BARRA DE ENVIO (SÓ APARECE NA REVISÃO) */}
           {step === 'review' && (
               <div className="h-[140px] bg-zinc-950 border-t border-zinc-800 p-6 shrink-0 animate-in slide-in-from-bottom-4">
                   <div className="flex items-end gap-4">
                       <div className="flex-1">
                           <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Enviar para Área</label>
                           <select 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white focus:border-green-500 outline-none"
                                value={selectedSector}
                                onChange={(e) => { setSelectedSector(e.target.value); setSelectedPerson(""); }}
                           >
                               <option value="">Selecione...</option>
                               {EQUIPE.map(eq => <option key={eq.id} value={eq.id}>{eq.label}</option>)}
                           </select>
                       </div>
                       
                       <div className="flex-1">
                           <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Responsável</label>
                           <select 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white focus:border-green-500 outline-none"
                                value={selectedPerson}
                                onChange={(e) => setSelectedPerson(e.target.value)}
                                disabled={!selectedSector}
                           >
                               <option value="">Selecione...</option>
                               {selectedSector && EQUIPE.find(e => e.id === selectedSector)?.people.map(p => (
                                   <option key={p} value={p}>{p}</option>
                               ))}
                           </select>
                       </div>

                       <Button onClick={handleSendJob} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg h-[34px]">
                           <Send className="w-4 h-4 mr-2" /> DISPARAR JOB
                       </Button>
                   </div>
               </div>
           )}
        </div>

      </div>
    </div>
  );
}
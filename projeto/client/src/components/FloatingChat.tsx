import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, X, Send, Bot, Users, Minimize2, 
  Paperclip, ChevronLeft, GripHorizontal, Search
} from "lucide-react";

// --- MOCK DATA ---
const TEAM_MEMBERS = [
  { id: 1, name: "Julia", role: "Redação", avatar: "J", status: "online", color: "bg-pink-600" },
  { id: 2, name: "Carlos", role: "Mídia", avatar: "C", status: "busy", color: "bg-purple-600" },
  { id: 3, name: "Ana", role: "Planning", avatar: "A", status: "away", color: "bg-orange-600" },
  { id: 4, name: "Roberto", role: "Produção", avatar: "R", status: "online", color: "bg-green-600" },
];

const MOCK_CHATS: Record<number, any[]> = {
  1: [ // Julia
    { id: 1, sender: "Julia", text: "O briefing da Varejo S.A chegou?", time: "10:30", type: "received" },
    { id: 2, sender: "Você", text: "Sim, acabei de colocar no Kanban.", time: "10:32", type: "sent" },
  ],
  2: [], // Carlos
  3: [], // Ana
};

const INITIAL_AI_CHAT = [
  { id: 1, role: "ai", text: "Olá Danilo. Sou a IA da Agência. Posso ajudar a encontrar arquivos, resumir briefings ou calcular métricas. Como posso ajudar?" }
];

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'team'>('ai');
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  
  // States de Chat
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [input, setInput] = useState("");
  const [aiHistory, setAiHistory] = useState(INITIAL_AI_CHAT);
  const [teamChats, setTeamChats] = useState(MOCK_CHATS);

  // States de Drag (Arrastar)
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [aiHistory, teamChats, selectedUser, isOpen]);

  // --- LÓGICA DE ARRASTAR ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    // Se moveu mais de 5px, considera que está arrastando
    if (Math.abs(e.clientX - dragStartPos.current.x) > 5 || Math.abs(e.clientY - dragStartPos.current.y) > 5) {
      isDragging.current = true;
    }
    
    // Limites da tela
    let newX = e.clientX - offset.current.x;
    let newY = e.clientY - offset.current.y;
    
    // Constraints (não sair da tela)
    const maxX = window.innerWidth - (isOpen ? 380 : 60);
    const maxY = window.innerHeight - (isOpen ? 500 : 60);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleClick = () => {
    if (!isDragging.current) {
      setIsOpen(!isOpen);
    }
  };

  // --- LÓGICA DE CHAT ---
  const handleSend = () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (activeTab === 'ai') {
        setAiHistory(prev => [...prev, { id: Date.now(), role: 'user', text: input }]);
        setTimeout(() => {
            setAiHistory(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: "Processando sua solicitação..." }]);
        }, 1000);
    } else if (selectedUser) {
        const userId = selectedUser.id;
        const newMsg = { id: Date.now(), sender: "Você", text: input, time, type: "sent" };
        setTeamChats(prev => ({
            ...prev,
            [userId]: [...(prev[userId] || []), newMsg]
        }));
    }
    setInput("");
  };

  // --- RENDERIZAÇÃO: BOTÃO FECHADO ---
  if (!isOpen) {
    return (
      <div 
        className="fixed z-50 cursor-move touch-none"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <div className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95">
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-black animate-pulse">3</span>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: JANELA ABERTA ---
  return (
    <div 
        className="fixed z-50 w-[380px] h-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ left: position.x, top: position.y }}
    >
      
      {/* HEADER (ARRASTÁVEL) */}
      <div 
        className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/80 backdrop-blur-md cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
         <div className="flex items-center gap-2 text-zinc-400">
             <GripHorizontal className="w-4 h-4 opacity-50" />
             {selectedUser ? (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                     <button onClick={() => setSelectedUser(null)} className="hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
                     <div className={`w-2 h-2 rounded-full ${selectedUser.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                     <span className="font-bold text-white text-sm">{selectedUser.name}</span>
                 </div>
             ) : (
                 <span className="font-bold text-sm text-white">Chat IAgência</span>
             )}
         </div>
         <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition"><Minimize2 className="w-4 h-4" /></button>
      </div>

      {/* TABS (SÓ APARECEM SE NÃO TIVER USUÁRIO SELECIONADO NA ABA TEAM) */}
      {(!selectedUser || activeTab === 'ai') && (
        <div className="flex p-2 gap-2 bg-zinc-900/30">
            <button onClick={() => {setActiveTab('ai'); setSelectedUser(null);}} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'ai' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-zinc-500 hover:bg-zinc-800'}`}>
                <Bot className="w-4 h-4"/> IA Copilot
            </button>
            <button onClick={() => setActiveTab('team')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'team' ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30' : 'text-zinc-500 hover:bg-zinc-800'}`}>
                <Users className="w-4 h-4"/> Equipe
            </button>
        </div>
      )}

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 relative" ref={scrollRef}>
          
          {/* VISÃO 1: LISTA DE EQUIPE */}
          {activeTab === 'team' && !selectedUser && (
              <div className="p-2 space-y-1">
                  <div className="p-2 relative"><Search className="w-4 h-4 absolute left-4 top-3.5 text-zinc-500"/><input className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" placeholder="Buscar colega..." /></div>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-bold text-zinc-500 uppercase">Disponíveis</p>
                  {TEAM_MEMBERS.map(member => (
                      <div key={member.id} onClick={() => setSelectedUser(member)} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-800/50 cursor-pointer transition group">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white relative ${member.color}`}>
                              {member.avatar}
                              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${member.status === 'online' ? 'bg-green-500' : member.status === 'busy' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-zinc-200 group-hover:text-white">{member.name}</span>
                                  <span className="text-[10px] text-zinc-600">10:30</span>
                              </div>
                              <p className="text-xs text-zinc-500 group-hover:text-zinc-400">{member.role}</p>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* VISÃO 2: CHAT COM USUÁRIO */}
          {activeTab === 'team' && selectedUser && (
              <div className="p-4 space-y-4">
                  {(teamChats[selectedUser.id] || []).length === 0 ? (
                      <div className="text-center pt-10 opacity-50"><p className="text-xs text-zinc-400">Inicie a conversa com {selectedUser.name}...</p></div>
                  ) : (
                      (teamChats[selectedUser.id] || []).map((msg: any) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.type === 'sent' ? 'flex-row-reverse' : ''}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${msg.type === 'sent' ? 'bg-purple-600/20 text-purple-100 rounded-tr-none border border-purple-600/30' : 'bg-zinc-800 text-zinc-300 rounded-tl-none border border-zinc-700'}`}>
                                <p className="font-bold mb-1 text-[9px] opacity-50">{msg.time}</p>
                                {msg.text}
                            </div>
                        </div>
                      ))
                  )}
              </div>
          )}

          {/* VISÃO 3: CHAT IA */}
          {activeTab === 'ai' && (
              <div className="p-4 space-y-4">
                  {aiHistory.map((msg: any) => (
                     <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-zinc-700 shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-white'}`}>
                             {msg.role === 'user' ? 'D' : <Bot className="w-4 h-4"/>}
                         </div>
                         <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-blue-900/20 text-blue-100 rounded-tl-none border border-blue-500/20'}`}>
                             {msg.text}
                         </div>
                     </div>
                  ))}
              </div>
          )}
      </div>

      {/* FOOTER (INPUT) */}
      {(activeTab === 'ai' || selectedUser) && (
          <div className="p-3 bg-zinc-900/50 border-t border-zinc-800">
              <div className="relative">
                  <input 
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition shadow-inner"
                     placeholder={activeTab === 'ai' ? "Pergunte à IA..." : `Mensagem para ${selectedUser?.name}...`}
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                     autoFocus
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                     <button className="p-1.5 text-zinc-500 hover:text-white transition rounded-md hover:bg-zinc-800"><Paperclip className="w-4 h-4" /></button>
                     <button onClick={handleSend} className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition shadow-lg shadow-blue-900/20"><Send className="w-3 h-3" /></button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
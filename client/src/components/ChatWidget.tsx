import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Minus, ChevronLeft, Search, Loader2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = "http://localhost:8000";

// --- DADOS MOCK (Contatos) ---
const CONTACTS = [
  { id: 1, name: "Julia", role: "Redação", status: "online", color: "bg-pink-500" },
  { id: 2, name: "Carlos", role: "Mídia", status: "busy", color: "bg-purple-500" },
  { id: 3, name: "Ana", role: "Planejamento", status: "offline", color: "bg-orange-500" },
  { id: 4, name: "Roberto", role: "Produção", status: "online", color: "bg-green-500" },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeContact, setActiveContact] = useState<any>(null);
  
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll para verificar novas mensagens a cada 3 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && activeContact && !isMinimized) {
        loadMessages(activeContact.id); // Carga inicial
        interval = setInterval(() => loadMessages(activeContact.id), 3000); // Polling
    }
    return () => clearInterval(interval);
  }, [activeContact, isOpen, isMinimized]);

  // Scroll automático
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (contactId: number) => {
    try {
      const res = await fetch(`${API_URL}/chat/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        // Só atualiza se houver mudança para evitar re-render
        setMessages(data);
      }
    } catch (error) {
      // Falha silenciosa no polling
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeContact) return;

    const tempText = inputText;
    setInputText(""); // Limpa input rápido (UX)

    // Otimista: Adiciona na tela antes de confirmar
    const tempMsg = {
        contact_id: activeContact.id,
        sender: 'me',
        content: tempText,
        timestamp: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempMsg)
      });
      // O Polling vai trazer a resposta depois
    } catch (error) {
      console.error("Erro ao enviar", error);
    }
  };

  // BOTÃO FLUTUANTE FECHADO
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-2xl z-50 flex items-center justify-center transition-all hover:scale-110 border-4 border-black"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </Button>
    );
  }

  // JANELA ABERTA
  return (
    <div className={`fixed right-6 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl rounded-t-xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out font-sans
      ${isMinimized ? 'bottom-0 h-14 w-72' : 'bottom-0 h-[500px] w-80 md:w-96 rounded-xl mb-6'}
    `}>
      
      {/* HEADER */}
      <div 
        className="bg-zinc-950 text-white p-3 flex justify-between items-center cursor-pointer select-none border-b border-zinc-800"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          {!isMinimized && activeContact ? (
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveContact(null); }}
              className="hover:bg-zinc-800 p-1 rounded-full transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <MessageSquare className="w-4 h-4" />
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-white">
              {activeContact ? activeContact.name : "Chat IAgência"}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight flex items-center gap-1">
              <Circle className={`w-2 h-2 fill-current ${activeContact?.status === 'online' ? 'text-green-500' : 'text-zinc-500'}`} />
              {activeContact ? activeContact.role : "Equipe Online"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1 hover:bg-zinc-800 rounded transition text-zinc-400 hover:text-white"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
            className="p-1 hover:bg-red-900/30 hover:text-red-500 rounded transition text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* LISTA DE CONTATOS (SE NENHUM SELECIONADO) */}
          {!activeContact && (
            <div className="flex-1 bg-zinc-50 dark:bg-black flex flex-col">
              <div className="p-3 border-b border-zinc-800 bg-zinc-900">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input 
                    placeholder="Buscar colega..." 
                    className="w-full bg-zinc-800 pl-9 pr-4 py-2 rounded-lg text-xs text-white border-none focus:ring-1 focus:ring-blue-600 placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {CONTACTS.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => setActiveContact(contact)}
                    className="flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl cursor-pointer transition border border-transparent group"
                  >
                    <div className={`w-10 h-10 rounded-full ${contact.color} flex items-center justify-center text-white font-bold relative text-sm border-2 border-zinc-900`}>
                      {contact.name.charAt(0)}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${contact.status === 'online' ? 'bg-green-500' : contact.status === 'busy' ? 'bg-red-500' : 'bg-zinc-400'}`}></span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-zinc-200 group-hover:text-white">{contact.name}</span>
                        <span className="text-[10px] text-zinc-600">{contact.status}</span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{contact.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÁREA DE CONVERSA */}
          {activeContact && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
                {messages.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-zinc-500"/>
                      <p className="text-xs text-zinc-500">Inicie a conversa com {activeContact.name}</p>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm relative shadow-sm
                        ${isMe 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700'
                        }
                      `}>
                        <p>{msg.content}</p>
                        <p className={`text-[9px] mt-1 text-right opacity-60 ${isMe ? 'text-blue-200' : 'text-zinc-500'}`}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* INPUT */}
              <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                  <input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-black text-white text-xs px-4 py-3 rounded-full border border-zinc-800 focus:outline-none focus:border-blue-600 transition-all placeholder:text-zinc-600"
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={!inputText.trim()} className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors">
                    <Send className="w-4 h-4 text-white" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
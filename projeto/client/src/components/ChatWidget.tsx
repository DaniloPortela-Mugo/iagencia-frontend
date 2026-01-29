import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Minus, ChevronLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- MOCK DE CONTATOS ---
const CONTACTS = [
  { id: 1, name: "Julia", role: "Redação", status: "online", avatarColor: "bg-pink-500" },
  { id: 2, name: "Carlos", role: "Mídia", status: "busy", avatarColor: "bg-purple-500" },
  { id: 3, name: "Ana", role: "Planejamento", status: "offline", avatarColor: "bg-orange-500" },
  { id: 4, name: "Roberto", role: "Produção", status: "online", avatarColor: "bg-green-500" },
];

const API_URL = "http://localhost:8000";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeContact, setActiveContact] = useState<typeof CONTACTS[0] | null>(null);
  
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. CARREGAR MENSAGENS
  useEffect(() => {
    if (activeContact) {
      loadMessages(activeContact.id);
    }
  }, [activeContact]);

  const loadMessages = async (contactId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((m: any) => ({
          id: m.id,
          // Fallback para garantir que o texto apareça independente do nome da coluna
          text: m.content || m.text || "Conteúdo indisponível",
          isMe: m.sender === 'me',
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formatted);
      }
    } catch (error) {
      console.error("Erro ao carregar chat", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized, loading]);

  // 2. ENVIAR MENSAGEM
  const handleSend = async () => {
    if (!inputText.trim() || !activeContact) return;

    const tempMsg = {
      id: Date.now().toString(),
      text: inputText,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, tempMsg]);
    setInputText("");

    try {
      await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: activeContact.id,
          sender: 'me',
          content: tempMsg.text
        })
      });

      // Simulação de resposta
      setTimeout(async () => {
        const replyText = `Ok, recebido!`;
        await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: activeContact.id,
            sender: 'them',
            content: replyText
          })
        });
        loadMessages(activeContact.id);
      }, 1500);

    } catch (error) {
      console.error("Erro ao enviar", error);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-2xl z-50 flex items-center justify-center transition-transform hover:scale-110 border-2 border-white dark:border-zinc-800"
      >
        <MessageSquare className="w-7 h-7 text-white" />
        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse"></span>
      </Button>
    );
  }

  return (
    <div className={`fixed right-6 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl rounded-t-xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out font-sans
      ${isMinimized ? 'bottom-0 h-14 w-72' : 'bottom-6 h-[550px] w-80 md:w-96 rounded-xl'}
    `}>
      
      {/* HEADER */}
      <div 
        className="bg-zinc-950 text-white p-3 flex justify-between items-center cursor-pointer select-none border-b border-zinc-800"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          {!isMinimized && activeContact ? (
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveContact(null); setMessages([]); }}
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
            <span className="font-bold text-sm leading-tight">
              {activeContact ? activeContact.name : "Mensagens"}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight">
              {activeContact ? activeContact.role : "Equipe Online"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1 hover:bg-zinc-800 rounded transition"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
            className="p-1 hover:bg-red-600/20 hover:text-red-500 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* LISTA DE CONTATOS */}
          {!activeContact && (
            <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50">
              <div className="p-3 sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    name="search_contact" // <--- ADICIONADO NOME
                    id="search_contact"   // <--- ADICIONADO ID
                    placeholder="Buscar colega..." 
                    className="w-full bg-white dark:bg-zinc-800 pl-9 pr-4 py-2 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="p-2 space-y-1">
                {CONTACTS.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => setActiveContact(contact)}
                    className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                  >
                    <div className={`w-10 h-10 rounded-full ${contact.avatarColor} flex items-center justify-center text-white font-bold relative`}>
                      {contact.name.charAt(0)}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${contact.status === 'online' ? 'bg-green-500' : contact.status === 'busy' ? 'bg-red-500' : 'bg-zinc-400'}`}></span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{contact.name}</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{contact.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT ATIVO */}
          {activeContact && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-100 dark:bg-black">
                {loading && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                )}
                
                {!loading && messages.length === 0 && (
                  <div className="text-center py-8 opacity-50">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Início da conversa com {activeContact.name}</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm relative
                      ${msg.isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
                      }
                    `}>
                      <p>{msg.text}</p>
                      <p className={`text-[9px] mt-1 text-right opacity-70 ${msg.isMe ? 'text-blue-100' : 'text-zinc-400'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                  <input 
                    type="text" 
                    name="chat_message" // <--- ADICIONADO NOME
                    id="chat_message"   // <--- ADICIONADO ID
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Mensagem...`}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={!inputText.trim()} className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                    <Send className="w-4 h-4" />
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
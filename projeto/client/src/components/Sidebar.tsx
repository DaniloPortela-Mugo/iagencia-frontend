import React from "react";
import { useLocation } from "wouter";
import { 
  Home, 
  Briefcase,     
  Palette,       
  BrainCircuit,  
  Clapperboard,
  Tv,           // <--- Mídia Offline
  Cloud,        // <--- Biblioteca/DAM
  Layers,       // <--- Mídia Online
  FileText,     // <--- Redação
  LogOut
} from "lucide-react";

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const menuItems = [
    { label: "Visão Geral", icon: Home, path: "/" },
    { label: "Atendimento", icon: Briefcase, path: "/atendimento" },
    { label: "Planejamento", icon: BrainCircuit, path: "/planning" },
    { label: "Redação", icon: FileText, path: "/creation/copy" }, // Adicionei Redação para ficar completo
    { label: "Direção de Arte", icon: Palette, path: "/creation/da" }, // Ajustei rota para o padrão novo
    { label: "Produção & RTV", icon: Clapperboard, path: "/production" },
    { label: "Mídia Online", icon: Layers, path: "/media" },
    { label: "Mídia Offline", icon: Tv, path: "/media-offline" }, // <--- NOVO
    { label: "Biblioteca (DAM)", icon: Cloud, path: "/library" }, // <--- NOVO
  ];

  return (
    <div className="w-64 bg-black border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">I</div>
        <span className="font-bold text-xl text-white tracking-tight">IAgência</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          // Verifica se a rota atual começa com o path do item (para manter ativo em sub-rotas)
          const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium
                ${isActive 
                  ? "bg-zinc-800 text-white shadow-lg border border-zinc-700" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-blue-500" : "text-zinc-500"}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-red-900/10 hover:text-red-500 transition-all text-sm font-medium">
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  );
}
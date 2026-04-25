import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Megaphone, Layers, CheckCircle2, 
  Menu, X, Calendar, Tv, FileText, Palette, 
  Clapperboard, Cloud, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingChat from "@/components/FloatingChat";

// --- SIMULAÇÃO DE PERMISSÕES (MOCK) ---
// Troque esta string para testar: 'full', 'smb', 'enterprise'
const CURRENT_USER_TYPE: 'full' | 'smb' | 'enterprise' = 'full'; 

const PERMISSIONS_MOCK = {
  full: ['dashboard', 'atendimento', 'planning', 'creation', 'production', 'media', 'media_offline', 'library', 'approvals', 'performance'],
  smb: ['dashboard', 'planning', 'creation', 'performance'], // Influenciador/Pequeno
  enterprise: ['dashboard', 'planning', 'creation', 'production', 'media_offline', 'library'] // Voy/Espaço Laser
};
// --------------------------------------

// Definição dos Módulos com seus IDs
const ALL_MODULES = [
  { id: 'dashboard', label: "Visão Geral", icon: LayoutDashboard, href: "/" },
  { id: 'atendimento', label: "Atendimento", icon: Megaphone, href: "/atendimento" },
  { id: 'planning', label: "Planejamento", icon: Calendar, href: "/planning" },
  { id: 'creation', label: "Criação (Copy)", icon: FileText, href: "/creation/copy" },
  { id: 'creation', label: "Criação (DA)", icon: Palette, href: "/creation/da" }, // Repete ID pois fazem parte do mesmo pacote
  { id: 'production', label: "Produção & RTV", icon: Clapperboard, href: "/production" },
  { id: 'media', label: "Mídia Online", icon: Layers, href: "/media" },
  { id: 'media_offline', label: "Mídia Offline", icon: Tv, href: "/media-offline" },
  { id: 'performance', label: "Performance", icon: BarChart3, href: "/performance" },
  { id: 'library', label: "Biblioteca (DAM)", icon: Cloud, href: "/library" },
  { id: 'approvals', label: "Aprovações", icon: CheckCircle2, href: "/approvals" },
];

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Aqui entraria o Hook real de Auth: const { allowed_modules } = useAuth();
  const allowed_modules = PERMISSIONS_MOCK[CURRENT_USER_TYPE];

  // Filtra o Menu
  const visibleNavItems = useMemo(() => {
    return ALL_MODULES.filter(item => allowed_modules.includes(item.id));
  }, []);

  const isActive = (path: string) => location === path || (path !== '/' && location.startsWith(path + "/"));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card fixed h-full z-30">
        <div className="p-6 border-b flex items-center gap-2 bg-card">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">I</div>
           <span className="font-bold text-xl tracking-tight">IAgência</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleNavItems.map((item, idx) => (
            <Link key={`${item.href}-${idx}`} href={item.href}>
              <a className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                isActive(item.href) 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t bg-card">
             {/* Mostra qual plano está ativo (apenas visual) */}
             <div className="bg-zinc-100 dark:bg-zinc-900 rounded p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Plano Atual</p>
                <p className="text-xs font-bold capitalize">{CURRENT_USER_TYPE === 'smb' ? 'Starter' : CURRENT_USER_TYPE === 'enterprise' ? 'Corporate' : 'Agency Pro'}</p>
             </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64 transition-all"> 
        {/* Header Mobile */}
        <div className="md:hidden p-4 border-b flex items-center justify-between bg-card z-40 relative">
             <span className="font-bold flex gap-2 items-center"><div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs">I</div> IAgência</span>
             <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? <X /> : <Menu />}
             </Button>
        </div>

        {/* Menu Mobile Overlay */}
        {isSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-background md:hidden flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <span className="font-bold text-lg">Menu</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}><X /></Button>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {visibleNavItems.map((item, idx) => (
                        <Link key={`${item.href}-${idx}`} href={item.href}>
                            <a onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isActive(item.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted/50"}`}>
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </a>
                        </Link>
                    ))}
                </nav>
            </div>
        )}

        <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-black relative">
            {children}
        </div>
      </main>

      <FloatingChat />
    </div>
  );
}
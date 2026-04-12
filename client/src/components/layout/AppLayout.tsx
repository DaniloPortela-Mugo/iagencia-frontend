import React, { ReactNode, useMemo, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { 
  LayoutDashboard, Users, PenTool, 
  MessageSquare, CheckSquare, Settings, 
  LogOut, Briefcase, Library, UserCircle, Video, Monitor, Newspaper, Truck,
  Image as ImageIcon,
  Film
} from "lucide-react";
import { ROLE_PERMISSIONS } from "../../permissions";

interface AppLayoutProps {
  children: ReactNode;
}

// 1. Adicionamos um 'id' em cada item para o sistema de permissões identificar
const ALL_MENU_ITEMS = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "atendimento", path: "/atendimento", label: "Brand Manager", icon: Users },
  //{ id: "planning", path: "/planning", label: "Planejamento", icon: Briefcase },
  { id: "social_media", path: "/social-media", label: "Social Media", icon: MessageSquare },
  { id: "copy", path: "/creation", label: "Redação", icon: PenTool }, 
  { id: "image_studio", path: "/image-studio", label: "Estúdio de Imagem", icon: ImageIcon },
  { id: "video_studio", path: "/video-studio", label: "Estúdio de Vídeo", icon: Film },
  { id: "production", path: "/production", label: "Produção (RTV)", icon: Video }, 
  { id: "media", path: "/media", label: "Midia On", icon: Monitor },
  { id: "media_offline", path: "/mediaoff", label: "Midia Off", icon: Newspaper },
  { id: "library", path: "/library", label: "Biblioteca", icon: Library },
  { id: "approvals", path: "/approvals", label: "Aprovações", icon: CheckSquare },
  { id: "suppliers", path: "/suppliers", label: "Fornecedores", icon: Truck },
  { id: "cadastro", path: "/cadastro", label: "Cadastros", icon: Settings },
];

// 2. O Sistema de Permissões (Ligado às roles do seu AuthContext)
export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout, activeTenant, setActiveTenant, tenantAccess, currentRole, currentModules } = useAuth();
  const [tenantOptions, setTenantOptions] = useState<{ slug: string; name: string }[]>([]);
  const internalAdmins = new Set([
    "36026e4f-d53c-422a-ae79-313f25eda530", // Danilo
    "48e96bd4-03b5-488e-91fb-c4e4a27d1d81", // Julia
    "a9c2011e-9d12-4289-9d27-9bf9d5096333", // Kleber
    "85215631-6fa6-497d-b176-c61c4e005b24", // Anaju
  ]);

  useEffect(() => {
    // Garante que nenhum lock de UI (Radix/modais) congele a tela
    document.documentElement.style.pointerEvents = "auto";
    document.body.style.pointerEvents = "auto";
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.overflow = "";
    return () => {
      document.documentElement.style.pointerEvents = "";
      document.body.style.pointerEvents = "";
    };
  }, []);

  const canSeeAllTenants = !!user?.allowedTenants?.includes("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadTenants = async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name", { ascending: true });

      if (error || !data) return;

      let options = data.filter((t: any) => t.is_active !== false);
      if (user?.id && !internalAdmins.has(user.id)) {
        options = options.filter((t) => t.slug !== "mugo-ag");
      }
      if (tenantAccess.length > 0) {
        const allowed = new Set(tenantAccess.map((t) => t.tenantSlug));
        options = options.filter((t) => allowed.has(t.slug));
      } else if (!user.allowedTenants.includes("all")) {
        options = options.filter((t) => user.allowedTenants.includes(t.slug));
      }

      if (!cancelled) setTenantOptions(options);
    };

    loadTenants();
    return () => {
      cancelled = true;
    };
  }, [user?.allowedTenants?.join("|"), tenantAccess.map((t) => t.tenantSlug).join("|")]);

  useEffect(() => {
    if (!user) return;
    if (canSeeAllTenants) return;
    if (!tenantOptions.length) return;
    const allowed = new Set(tenantOptions.map((t) => t.slug));
    if (!activeTenant || activeTenant === "all" || !allowed.has(activeTenant)) {
      setActiveTenant(tenantOptions[0].slug);
    }
  }, [user, canSeeAllTenants, tenantOptions, activeTenant, setActiveTenant]);

  // 3. A Mágica do Filtro: Calcula quais botões mostrar baseado no cargo do usuário
  const visibleMenuItems = useMemo(() => {
    if (currentModules.length > 0) {
      const allowed = new Set([...currentModules, "dashboard"]);
      return ALL_MENU_ITEMS.filter(item => allowed.has(item.id));
    }
    // Fallback: usa permissões baseadas na role quando não há módulos configurados
    const roleModules = ROLE_PERMISSIONS[currentRole] ?? ROLE_PERMISSIONS["admin"];
    return ALL_MENU_ITEMS.filter(item => roleModules.includes(item.id));
  }, [currentModules.join("|"), currentRole]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* SIDEBAR (MENU ESQUERDO) */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 z-50">
        
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800 shrink-0">
          <img 
            src="/logoIA.png" 
            alt="IAgência Logo" 
            className="w-16 h-16 rounded-lg mr-3 object-contain bg-black"
            onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('afterbegin', '<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs mr-3">IA</div>');
            }}
          />
          <span className="font-bold text-lg tracking-tight">IAgência</span>
        </div>

        {/* NAVEGAÇÃO DINÂMICA */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2 mt-2">Departamentos</p>
          
          {/* Agora mapeamos o 'visibleMenuItems' filtrado, em vez do array original inteiro */}
          {visibleMenuItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-purple-600/10 text-purple-400" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-purple-500" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* USER PROFILE INFO (RODAPÉ SIDEBAR) */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <UserCircle className="w-6 h-6 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || "Usuário"}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider truncate">{currentRole || "Role"}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg text-xs font-bold transition-all border border-zinc-800 hover:border-red-500/20"
          >
            <LogOut className="w-3 h-3" /> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL (DIREITA) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* HEADER TOP BAR */}
        <header className="h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-8 z-40 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-zinc-300">Ambiente de Trabalho</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* SELETOR DE TENANT (CLIENTE ATIVO) - apenas Mugô */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl p-1.5 pr-4 shadow-inner">
              <div className="bg-zinc-800 p-1.5 rounded-lg border border-zinc-700">
                <Briefcase className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none mb-0.5">Cliente Ativo</span>
                {canSeeAllTenants ? (
                  <select 
                    className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer appearance-none hover:text-purple-300 transition-colors"
                    value={activeTenant || ""}
                    onChange={(e) => setActiveTenant(e.target.value)}
                  >
                    {(tenantOptions.length ? tenantOptions : (user?.allowedTenants || []).map((slug) => ({ slug, name: slug }))).map(tenant => (
                      <option key={tenant.slug} value={tenant.slug} className="bg-zinc-900 text-white">
                        {tenant.name || (tenant.slug === 'mugo' ? 'MUGÔ' : tenant.slug === 'ssavon' ? 'SSAVON' : tenant.slug.toUpperCase())}
                      </option>
                    ))}
                    {user?.allowedTenants.includes("all") && (
                      <option value="all" className="bg-zinc-900 text-white">TODOS OS CLIENTES</option>
                    )}
                  </select>
                ) : (
                  <span className="text-sm font-bold text-white">
                    {tenantOptions.find(t => t.slug === activeTenant)?.name || activeTenant || "Selecione um cliente"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#0a0a0a]">
          {children}
        </main>

      </div>
    </div>
  );
}

import React from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "sonner";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-zinc-900 border border-red-800 rounded-xl p-6 text-center space-y-3">
            <h1 className="text-lg font-bold text-red-400">Algo deu errado</h1>
            <p className="text-sm text-zinc-400">
              Recarregue a página. Se o problema persistir, contate o suporte.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DEFAULT_MODULE, MODULE_ROUTE_MAP, ROLE_PERMISSIONS } from "./permissions";

// Layout
import AppLayout from "./components/layout/AppLayout";

// Páginas
import Production from "./pages/Production";
import Cadastro from "./pages/Cadastro";
import Planning from "./pages/Planning";
import SocialMedia from "./pages/SocialMedia";
import Library from "./pages/Library";
import Atendimento from "./pages/Atendimento";
import Approvals from "./pages/Approvals";
import Creation from "./pages/Creation";
import ImageStudio from './pages/ImageStudio'; 
import VideoStudio from './pages/VideoStudio';  
import Dashboard from "./pages/Dashboard"; 
import Media from "./pages/Media"; 
import MediaOff from "./pages/MediaOffline"; 
import Monitor from "./pages/Monitor";
import Login from "./pages/Login";
import LoginLite from "./pages/LoginLite";
import Suppliers from "./pages/Suppliers";
import ChangePassword from "./pages/ChangePassword";
import BrandProfile from "./pages/BrandProfile";

const Placeholder = ({ title }: { title: string }) => (
  <div className="p-10 text-zinc-500">Página em construção: {title}</div>
);

function NoAccess({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4">
        <h1 className="text-lg font-bold text-white">Sem acesso configurado</h1>
        <p className="text-sm text-zinc-400">
          Seu usuário não possui acesso a nenhum cliente. Peça ao administrador para configurar o acesso.
        </p>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

// --- ROTEADOR PROTEGIDO ---
function AppRouter() {
    const { isAuthenticated, authLoading, profileLoading, user, tenantAccess, logout, currentRole, currentModules, mustChangePassword } = useAuth();
    const [location, setLocation] = useLocation();
    const hasAnyAccess = tenantAccess.length > 0 || Boolean(user?.allowedTenants?.length);
    const allowedModules =
      currentModules.length > 0
        ? currentModules
        : ROLE_PERMISSIONS[currentRole] ?? ROLE_PERMISSIONS["admin"];
    const allowedSet = new Set([DEFAULT_MODULE, ...allowedModules]);
    const currentModule = MODULE_ROUTE_MAP[location];
    const showDebug = typeof window !== "undefined" && localStorage.getItem("debug_auth") === "1";

    // Aguarda a verificação inicial do auth antes de renderizar qualquer coisa
    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Se não estiver logado, força a tela de Login
    if (!isAuthenticated) {
        return location === "/login-lite" ? <LoginLite /> : <Login />;
    }

    if (mustChangePassword) {
        return <ChangePassword />;
    }

    // Estado de transição: token setado mas perfil ainda não carregado (SIGNED_IN pendente)
    if (!user) {
        return (
            <div className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!hasAnyAccess) {
        return <NoAccess onLogout={logout} />;
    }

    if (currentModule && !allowedSet.has(currentModule)) {
        const firstAllowedPath =
          Object.keys(MODULE_ROUTE_MAP).find((path) => allowedSet.has(MODULE_ROUTE_MAP[path])) || "/dashboard";
        return (
          <AppLayout>
            {showDebug && (
              <div className="bg-zinc-950 text-zinc-200 text-xs p-3 border-b border-zinc-800">
                <pre className="whitespace-pre-wrap break-words">
{JSON.stringify({
  location,
  currentModule,
  allowedModules,
  currentRole,
  userId: user?.id,
  tenantAccess,
  hasAnyAccess,
}, null, 2)}
                </pre>
              </div>
            )}
            <div className="min-h-screen w-full flex items-center justify-center p-10 text-zinc-300">
              <div className="max-w-md w-full text-center bg-zinc-950 border border-zinc-800 rounded-xl p-8">
                <h2 className="text-lg font-bold text-white mb-2">Acesso restrito</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  Você não tem permissão para acessar esta página.
                </p>
                <button
                  onClick={() => setLocation(firstAllowedPath)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded"
                >
                  Ir para minha página
                </button>
              </div>
            </div>
          </AppLayout>
        );
    }

    return (
        <AppLayout>
            {showDebug && (
              <div className="bg-zinc-950 text-zinc-200 text-xs p-3 border-b border-zinc-800">
                <pre className="whitespace-pre-wrap break-words">
{JSON.stringify({
  location,
  currentModule,
  allowedModules,
  currentRole,
  userId: user?.id,
  tenantAccess,
  hasAnyAccess,
}, null, 2)}
                </pre>
              </div>
            )}
            <Switch>
                <Route path="/production" component={Production} />
                <Route path="/cadastro" component={Cadastro} />
                <Route path="/social-media" component={SocialMedia} />
                <Route path="/atendimento" component={Atendimento} />
                <Route path="/planning" component={Planning} />
                <Route path="/library" component={Library} />
                <Route path="/approvals" component={Approvals} />
                <Route path="/creation" component={Creation} />
                <Route path="/image-studio" component={ImageStudio} />
                <Route path="/video-studio" component={VideoStudio} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/media" component={Media} />
                <Route path="/mediaoff" component={MediaOff} />
                <Route path="/monitor" component={Monitor} />
                <Route path="/suppliers" component={Suppliers} />
                <Route path="/brand-profile" component={BrandProfile} />
                
                {/* Fallback */}
                <Route path="/"><Placeholder title="Bem-vindo à IAgência." /></Route>
            </Switch>
        </AppLayout>
    );
}

// --- APP PRINCIPAL ---
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" theme="dark" />
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

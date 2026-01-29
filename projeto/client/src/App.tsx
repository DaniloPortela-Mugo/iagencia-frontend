import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "sonner"; // Importante para os avisos de sucesso/erro

// Layouts
import CampaignLayout from "@/components/layout/CampaignLayout";

// Páginas Públicas
import Login from "@/pages/Login";
import OnboardingWizard from "@/pages/OnboardingWizard";

// Páginas Internas (Protegidas)
import Dashboard from "@/pages/Dashboard";
import CreationDA from "@/pages/CreationDA";
import Planning from "@/pages/Planning";
import Production from "@/pages/Production";
// import MediaOffline from "@/pages/MediaOffline"; // Descomente quando criar

function App() {
  // Simulação de Auth (Para o MVP)
  const isAuthenticated = true; 

  return (
    <>
      {/* Sistema de Notificações (Toast) */}
      <Toaster position="top-right" richColors />

      <Switch>
        {/* Rota Raiz: Redireciona para Dashboard ou Login */}
        <Route path="/">
            {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
        </Route>

        <Route path="/login" component={Login} />
        <Route path="/setup" component={OnboardingWizard} />

        {/* Rotas da Aplicação (Com Sidebar) */}
        <Route path="/dashboard" component={() => <CampaignLayout><Dashboard /></CampaignLayout>} />
        <Route path="/creation" component={() => <CampaignLayout><CreationDA /></CampaignLayout>} />
        <Route path="/planning" component={() => <CampaignLayout><Planning /></CampaignLayout>} />
        <Route path="/production" component={() => <CampaignLayout><Production /></CampaignLayout>} />
        
        {/* Fallback 404 */}
        <Route>
          <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-zinc-500">Página não encontrada no QG da IAgência.</p>
                <a href="/" className="text-blue-500 hover:underline mt-4 block">Voltar ao Início</a>
            </div>
          </div>
        </Route>
      </Switch>
    </>
  );
}

export default App;
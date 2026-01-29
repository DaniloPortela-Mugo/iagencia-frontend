import { useState } from "react";
import { useLocation } from "wouter";
import { authService } from "../services/authService"; // Importe o serviço novo
// Se der erro no import do 'useAuth', verifique onde ele está no seu projeto.
// Geralmente está em ../contexts/AuthContext ou similar. 
// Para simplificar, vou assumir que você salva no localStorage ou session aqui.

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Chama o Python
      const response = await authService.login(email, password);
      
      // 2. Salva o usuário na sessão (Simulação de Auth)
      // O ideal é usar seu AuthContext aqui, mas isso resolve o bloqueio imediato:
      localStorage.setItem("user_session", JSON.stringify(response.user));
      
      // 3. Redireciona para o Dashboard
      window.location.href = "/"; // Força um reload para o App pegar o localStorage
      
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">IAgência</h1>
          <p className="text-zinc-400 mt-2">Entre para acessar o sistema</p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition-colors"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-all disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
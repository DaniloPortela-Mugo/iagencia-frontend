import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);

  // useLayoutEffect roda antes da pintura — garante que pointer-events
  // esteja correto antes do usuário ver/interagir com a página.
  // Também limpa qualquer lock de scroll/pointer do Radix UI que possa
  // ter ficado preso de uma sessão anterior.
  useLayoutEffect(() => {
    document.documentElement.style.pointerEvents = "auto";
    document.body.style.pointerEvents = "auto";
    document.body.removeAttribute("data-scroll-locked");
    document.body.removeAttribute("inert");
    document.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));
    document.body.style.overflow = "";
    return () => {
      document.documentElement.style.pointerEvents = "";
      document.body.style.pointerEvents = "";
    };
  }, []);

  const handleClearSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.slice(0, eqPos) : c;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
      window.location.reload();
    } catch {
      // no-op
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      setLocation("/dashboard");

    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-zinc-950 text-white relative z-50"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="w-full max-w-md p-8 space-y-6 bg-zinc-900 rounded-xl border border-zinc-800"
        style={{ pointerEvents: "auto" }}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">IAgência</h1>
          <p className="text-zinc-400 mt-2">Entre para acessar o sistema</p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" style={{ pointerEvents: "auto" }} autoComplete="off">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="login-email"
              name="login_email"
              type="email"
              autoFocus
              ref={emailRef}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ pointerEvents: "auto" }}
              className="w-full p-2 rounded bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium mb-1">Senha</label>
            <input
              id="login-password"
              name="login_password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ pointerEvents: "auto" }}
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

        <button
          type="button"
          onClick={handleClearSession}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded transition-all text-sm"
        >
          Limpar sessão
        </button>
      </div>
    </div>
  );
}

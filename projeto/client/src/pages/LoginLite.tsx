import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";

export default function LoginLite() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { login } = useAuth();

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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0b0b", color: "#fff" }}>
      <form
        onSubmit={handleLogin}
        style={{
          width: 360,
          padding: 24,
          background: "#111",
          border: "1px solid #222",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Login (Lite)</h1>
        {error && <div style={{ background: "#2b0f0f", border: "1px solid #5b1a1a", padding: 8, borderRadius: 8 }}>{error}</div>}

        <label htmlFor="lite-email" style={{ fontSize: 12 }}>Email</label>
        <input
          id="lite-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#0d0d0d",
            color: "#fff",
            outline: "none",
          }}
        />

        <label htmlFor="lite-password" style={{ fontSize: 12 }}>Senha</label>
        <input
          id="lite-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#0d0d0d",
            color: "#fff",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "#c51717",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

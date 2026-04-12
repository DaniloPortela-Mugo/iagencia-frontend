import { API_BASE } from "@/api";

export const authService = {
  async login(email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let errorMessage = "Falha no login";
        try {
          const err = await res.json();
          errorMessage = err.detail || errorMessage;
        } catch {
          errorMessage = res.statusText;
        }
        throw new Error(errorMessage);
      }

      return await res.json();
    } catch (error: any) {
      console.error("Erro no Auth:", error);
      throw error;
    }
  },
};

// ARQUIVO: client/src/services/authService.ts
const API_URL = 'http://localhost:8000';

export const authService = {
  async login(email: string, password: string) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let errorMessage = 'Falha no login';
        try {
          const err = await res.json();
          errorMessage = err.detail || errorMessage;
        } catch (e) {
          errorMessage = res.statusText;
        }
        throw new Error(errorMessage);
      }

      return await res.json();
    } catch (error: any) {
      console.error("Erro no Auth:", error);
      throw error; 
    }
  }
};
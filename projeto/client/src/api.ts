export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

/**
 * Base pública (caso o backend esteja exposto em um domínio).
 * Padrão do Vite: variáveis precisam começar com VITE_.
 */
export const API_PUBLIC_BASE =
  import.meta.env.VITE_API_PUBLIC_BASE ??
  import.meta.env.VITE_API_BASE ??
  "http://localhost:8000";

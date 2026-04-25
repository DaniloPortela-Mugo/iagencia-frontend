import { API_BASE } from "@/config/api";

export interface JobRequest {
  user_email: string;
  tenant_slug: string;
  client_slug: string;
  campaign_name: string;
  task_name: string;
  description: string;
  departments: string[];
  deliverables: string[];
}

export interface JobResponse {
  status: string;
  cost: number;
  outputs: {
    copy?: any;
    prompt_en?: string;
    assets?: any[];
  };
}

export const aiService = {
  async getClientConfig(tenant: string, client: string) {
    try {
      const res = await fetch(`${API_BASE}/client-config/${tenant}/${client}`);
      if (!res.ok) throw new Error("Falha ao buscar config");
      return await res.json();
    } catch (error) {
      console.error("Erro de conexão com Python:", error);
      return { brand_name: client, wallet_balance: 0 };
    }
  },

  async startJob(data: JobRequest): Promise<JobResponse> {
    const res = await fetch(`${API_BASE}/start-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || "Erro ao processar job");
    }

    return await res.json();
  },
};

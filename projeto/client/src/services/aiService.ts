// projeto/client/src/services/aiService.ts

const API_URL = 'http://localhost:8000';

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
  // Busca configuração e saldo do cliente
  async getClientConfig(tenant: string, client: string) {
    try {
      const res = await fetch(`${API_URL}/client-config/${tenant}/${client}`);
      if (!res.ok) throw new Error('Falha ao buscar config');
      return await res.json();
    } catch (error) {
      console.error("Erro de conexão com Python:", error);
      return { brand_name: client, wallet_balance: 0 };
    }
  },

  // Envia o pedido para a IA
  async startJob(data: JobRequest): Promise<JobResponse> {
    const res = await fetch(`${API_URL}/start-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Erro ao processar job');
    }

    return await res.json();
  }
};
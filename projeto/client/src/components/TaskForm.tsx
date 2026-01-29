import { useState, useEffect } from 'react';
import { aiService, JobRequest } from '../services/aiService';
import { useForm } from 'react-hook-form'; // Se não tiver: npm install react-hook-form

// Tipagem simples para o formulário
type FormValues = {
  campaign: string;
  task: string;
  description: string;
  // Checkboxes
  dept_plan: boolean;
  dept_create: boolean;
  dept_media: boolean;
  dept_prod: boolean;
};

export function TaskForm({ tenantSlug, clientSlug, userEmail }: { tenantSlug: string, clientSlug: string, userEmail: string }) {
  const { register, handleSubmit } = useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<string[]>(["image_feed"]);

  // Função que envia para o Python
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setResult(null);

    // 1. Mapeia os departamentos marcados
    const depts = [];
    if (data.dept_plan) depts.push("planejamento");
    if (data.dept_create) depts.push("criacao");
    if (data.dept_media) depts.push("midia");
    if (data.dept_prod) depts.push("producao");

    // 2. Monta o objeto que o Python espera
    const payload: JobRequest = {
      user_email: userEmail,
      tenant_slug: tenantSlug,
      client_slug: clientSlug,
      campaign_name: data.campaign || "Campanha Rápida",
      task_name: data.task,
      description: data.description,
      departments: depts,
      deliverables: deliverables
    };

    try {
      // 3. CHAMA A API REAL
      const response = await aiService.startJob(payload);
      setResult(response); // Guarda o retorno real da IA
    } catch (error) {
      alert("Erro ao conectar com a IA: " + error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDeliverable = (item: string) => {
    setDeliverables(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-zinc-900 text-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-red-600">🚀 Nova Tarefa: {clientSlug.toUpperCase()}</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Linha 1: Campos de Texto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Campanha</label>
            <input 
              {...register("campaign")}
              defaultValue="Lançamento Verão"
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:border-red-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Peça</label>
            <input 
              {...register("task", { required: true })}
              placeholder="Ex: Post Instagram"
              className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:border-red-500 outline-none"
            />
          </div>
        </div>

        {/* Linha 2: Descrição (O Briefing Real) */}
        <div>
          <label className="block text-sm font-medium mb-1">Briefing (Descrição)</label>
          <textarea 
            {...register("description", { required: true })}
            rows={4}
            placeholder="Descreva o que a IA deve criar..."
            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:border-red-500 outline-none"
          />
        </div>

        {/* Linha 3: Checkboxes Departamentos (PDF Pág 3) */}
        <div className="bg-zinc-800 p-4 rounded border border-zinc-700">
          <label className="block text-sm font-bold mb-3 text-gray-400">Departamentos Envolvidos:</label>
          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("dept_plan")} className="accent-red-600 w-5 h-5" /> Planejamento
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("dept_create")} defaultChecked className="accent-red-600 w-5 h-5" /> Criação
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("dept_media")} className="accent-red-600 w-5 h-5" /> Mídia
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("dept_prod")} defaultChecked className="accent-red-600 w-5 h-5" /> Produção
            </label>
          </div>
        </div>

        {/* Linha 4: Entregáveis (Multiselect Visual) */}
        <div>
          <label className="block text-sm font-bold mb-2">O que deve ser entregue?</label>
          <div className="flex gap-2 flex-wrap">
            {['image_feed', 'video_short', 'copy_deck', 'pack_criativo'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => toggleDeliverable(item)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  deliverables.includes(item) 
                    ? 'bg-red-600 text-white' 
                    : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                }`}
              >
                {item.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Botão de Ação */}
        <button 
          type="submit" 
          disabled={loading}
          className={`w-full py-3 rounded font-bold text-lg transition-all ${
            loading 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50'
          }`}
        >
          {loading ? "🤖 Agentes Trabalhando..." : "🚀 Iniciar Job"}
        </button>

      </form>

      {/* ÁREA DE RESULTADO (A Prova Real) */}
      {result && (
        <div className="mt-8 p-4 bg-black rounded border border-green-900 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-xl font-bold text-green-500 mb-4">✅ Resultado Gerado pela IA</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* O Texto que prova a interpretação */}
            {result.outputs.copy && (
              <div className="bg-zinc-800 p-3 rounded">
                <h4 className="font-bold text-gray-400 mb-2">📝 Copy (Redator)</h4>
                <div className="text-sm whitespace-pre-wrap bg-zinc-900 p-2 rounded border border-zinc-700">
                  {/* Se vier JSON, formata, senão mostra texto */}
                  {typeof result.outputs.copy === 'string' 
                    ? result.outputs.copy 
                    : JSON.stringify(result.outputs.copy, null, 2)}
                </div>
              </div>
            )}

            {/* O Prompt Visual */}
            {result.outputs.prompt_en && (
              <div className="bg-zinc-800 p-3 rounded">
                <h4 className="font-bold text-gray-400 mb-2">🎨 Prompt Visual (DA)</h4>
                <p className="text-sm text-yellow-500 italic">"{result.outputs.prompt_en}"</p>
              </div>
            )}
          </div>

          <div className="mt-4 text-right text-xs text-gray-500">
            Custo Real da Operação: ${result.cost}
          </div>
        </div>
      )}
    </div>
  );
}
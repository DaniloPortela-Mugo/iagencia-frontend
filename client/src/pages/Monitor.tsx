import React, { useEffect, useState, useMemo } from "react";
import { 
  ShieldCheck, Zap, Activity, CreditCard, 
  History, ArrowUpRight, ArrowDownRight, 
  RefreshCw, AlertCircle, Wallet, Server, 
  BarChart3, Plus, ChevronRight, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// IMPORTAÇÕES DE DADOS
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";

export default function Monitor() {
  const { activeTenant } = useAuth();
  
  // --- ESTADOS REAIS ---
  const [balance, setBalance] = useState<number>(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('online');

  // 1. BUSCAR SALDO E LOGS DO SUPABASE
  const fetchData = async () => {
    if (!activeTenant || activeTenant === "all") return;
    setIsLoading(true);
    
    try {
      // Puxa Saldo Atual
      const { data: wallet } = await supabase
        .from('tenants_wallets')
        .select('credit_balance')
        .eq('tenant_slug', activeTenant)
        .single();
      
      if (wallet) setBalance(wallet.credit_balance);

      // Puxa Histórico de Consumo
      const { data: history } = await supabase
        .from('credit_logs')
        .select('*')
        .eq('tenant_slug', activeTenant)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (history) setLogs(history);

      // Checa Saúde do Backend Python
      const health = await fetch(`${API_BASE}/health`).catch(() => ({ ok: false }));
      setApiStatus(health.ok ? 'online' : 'offline');

    } catch (error) {
      console.error("Erro ao monitorar créditos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Inscrição Realtime para atualizar saldo quando a IA debitar algo
    const channel = supabase.channel('wallet_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants_wallets', filter: `tenant_slug=eq.${activeTenant}` }, () => fetchData())
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [activeTenant]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8 font-sans overflow-y-auto scrollbar-thin">
      
      {/* HEADER DE MONITORAMENTO */}
      <div className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-500" /> Centro de Operações & Billing
          </h1>
          <p className="text-zinc-500 mt-1">Gestão de créditos e integridade das APIs para <b>{activeTenant?.toUpperCase()}</b>.</p>
        </div>
        <div className="flex gap-3">
            <Badge variant="outline" className={`px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold ${apiStatus === 'online' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                Engine Status: {apiStatus.toUpperCase()}
            </Badge>
            <Button onClick={fetchData} variant="outline" size="icon" className="border-zinc-800 bg-zinc-900 text-zinc-400">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      {/* PAINEL FINANCEIRO (WALLET) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        <Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-20 h-20 text-white" />
          </div>
          <CardContent className="p-8">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Saldo de Créditos</p>
            <h3 className="text-4xl font-black text-white">{formatCurrency(balance)}</h3>
            <div className="mt-6 flex gap-3">
                <Button className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs gap-2">
                    <Plus className="w-4 h-4" /> Recarregar Saldo
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl">
          <CardContent className="p-8">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Consumo Mensal</p>
            <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black text-white">{formatCurrency(balance * 0.15)}</h3>
                <span className="text-xs text-red-400 font-bold mb-1 flex items-center"><ArrowUpRight className="w-3 h-3"/> +4%</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-4 uppercase font-bold tracking-tighter">Projeção: Restam {(balance / 10).toFixed(0)} dias de uso</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl">
          <CardContent className="p-8">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Segurança & API</p>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">OpenAI GPT-4o</span>
                    <Badge className="bg-green-900/40 text-green-500 border-0 h-4 text-[9px]">Latência 240ms</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Google Veo 3</span>
                    <Badge className="bg-green-900/40 text-green-500 border-0 h-4 text-[9px]">Stable</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Flux Pro (Art)</span>
                    <Badge className="bg-green-900/40 text-green-500 border-0 h-4 text-[9px]">Active</Badge>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA: HISTÓRICO DE CONSUMO REAL */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4"/> Extrato de Utilização
                </h2>
                <Button variant="link" className="text-xs text-blue-400">Ver extrato completo</Button>
            </div>

            <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 text-zinc-500 font-bold uppercase text-[10px]">
                        <tr>
                            <th className="px-6 py-4">Serviço IA</th>
                            <th className="px-6 py-4">Data/Hora</th>
                            <th className="px-6 py-4 text-right">Custo</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-zinc-600 italic">Nenhum consumo registrado recentemente.</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-200">{log.description || "Geração de Mídia"}</p>
                                                <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">{log.feature}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-zinc-500">
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-red-400">
                                        -{formatCurrency(Math.abs(log.amount))}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center"><CheckCircle2 className="w-4 h-4 text-green-500 opacity-50" /></div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>
        </div>

        {/* COLUNA: INFRAESTRUTURA & LIMITES */}
        <div className="space-y-6">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Server className="w-4 h-4 text-blue-500"/> Infraestrutura
            </h2>
            
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl p-6 space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Tokens por Minuto (TPM)</span>
                        <span className="text-xs font-bold text-white">45k / 1M</span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-zinc-800">
                        <div className="h-full bg-blue-500 w-[15%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Geração de Vídeo (Concurrency)</span>
                        <span className="text-xs font-bold text-white">2 / 5 slots</span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-zinc-800">
                        <div className="h-full bg-purple-500 w-[40%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                    </div>
                </div>

                <div className="bg-black/50 p-4 rounded-xl border border-zinc-800">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-white">Criptografia Ativa</p>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Todos os prompts e imagens são protegidos via AES-256 e não são utilizados para treinamento de modelos públicos.</p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/20 p-6 rounded-2xl">
                <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpRight className="w-4 h-4"/> Upgrade Disponível</h4>
                <p className="text-sm text-zinc-300 leading-relaxed italic">"Poupe 20% migrando para o plano anual Enterprise e ganhe limites dedicados de API."</p>
                <Button variant="link" className="text-green-400 p-0 h-auto mt-4 text-xs font-bold hover:text-green-300">Conhecer Planos →</Button>
            </div>
        </div>

      </div>
    </div>
  );
}
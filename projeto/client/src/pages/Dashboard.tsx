import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  LayoutDashboard, Users, MessageSquare, PenTool, 
  ImageIcon, Film, Megaphone, CheckCircle2, 
  Clock, AlertCircle, ArrowUpRight, TrendingUp,
  ChevronRight, Activity, Calendar, Sparkles,
  Circle, DollarSign, Zap, Database, AlertTriangle,
  ArrowRight, MoreHorizontal, CreditCard, Timer, 
  Monitor, Layers, Loader2, BarChart3
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { ROLE_PERMISSIONS } from "../permissions";

export default function Dashboard() {
  const { activeTenant, user, tenantAccess, currentRole, currentModules } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

 // 1. Estados iniciais
const [tasks, setTasks] = useState<any[]>([]);
const [clientsData, setClientsData] = useState<any[]>([]);
const [creditRows, setCreditRows] = useState<any[]>([]);
const [creditsLoading, setCreditsLoading] = useState(false);
const [creditsError, setCreditsError] = useState<string | null>(null);
const [creditLogs, setCreditLogs] = useState<any[]>([]);
const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role: string; dept: string }[]>([]);

const allowedTenants = useMemo(() => {
  const list = (tenantAccess || []).map((t) => t.tenantSlug).filter(Boolean);
  return list.length ? list : (user?.allowedTenants || []);
}, [tenantAccess, user?.allowedTenants]);

const allowedDepartments = useMemo(() => {
  const moduleList =
    currentModules.length > 0
      ? currentModules
      : ROLE_PERMISSIONS[currentRole] ?? ROLE_PERMISSIONS["admin"];

  const moduleToDept: Record<string, string> = {
    atendimento: "atendimento",
    planning: "planning",
    social_media: "social_media",
    copy: "redacao",
    image_studio: "arte",
    video_studio: "producao",
    production: "producao",
    media: "media",
    media_offline: "mediaoff",
  };

  const departments = moduleList
    .map((m) => moduleToDept[m])
    .filter(Boolean);

  return Array.from(new Set(departments));
}, [currentModules.join("|"), currentRole]);

// 2. Primeiro filtramos as tarefas com base no Tenant selecionado
// Isso precisa vir ANTES do 'stats'
const filteredTasks = useMemo(() => {
  let result = tasks;
  if (activeTenant && activeTenant !== "all") {
    result = result.filter(t => t.tenant === activeTenant);
  } else if (allowedTenants.length) {
    result = result.filter(t => allowedTenants.includes(t.tenant));
  }

  if (allowedDepartments.length) {
    result = result.filter(t => allowedDepartments.includes(t.department));
  }

  return result;
}, [tasks, activeTenant, allowedTenants, allowedDepartments]);

// 3. Agora calculamos as estatísticas baseadas nas tarefas já filtradas
// Regras: refletir status do Kanban do Atendimento (por tenant)
const stats = useMemo(() => {
  const atendimentoTasks = filteredTasks.filter(t => t.department === "atendimento");
  const total = atendimentoTasks.length;

  const jobsEmAberto = atendimentoTasks.filter(t => t.status === "todo" || t.status === "doing").length;
  const aguardandoAprovacao = atendimentoTasks.filter(t => t.status === "review").length;
  const finalizado = atendimentoTasks.filter(t => t.status === "done").length;

  return {
    total,
    pending: jobsEmAberto,
    completed: finalizado,
    critical: aguardandoAprovacao,
    byDept: {
      redacao: filteredTasks.filter(t => t.department === 'redacao').length,
      arte: filteredTasks.filter(t => t.department === 'arte').length,
      producao: filteredTasks.filter(t => t.department === 'producao').length,
    }
  };
}, [filteredTasks]); // ✅ Agora ele encontra o nome 'filteredTasks'

  const filteredCredits = useMemo(() => {
    if (activeTenant && activeTenant !== "all") {
      return creditRows.filter((c) => c.tenant_slug === activeTenant);
    }
    if (allowedTenants.length) {
      return creditRows.filter((c) => allowedTenants.includes(c.tenant_slug));
    }
    return creditRows;
  }, [creditRows, activeTenant, allowedTenants]);

  const filteredLogs = useMemo(() => {
    const logs = creditLogs;
    if (activeTenant && activeTenant !== "all") return logs.filter((l) => l.tenant_slug === activeTenant);
    if (allowedTenants.length) return logs.filter((l) => allowedTenants.includes(l.tenant_slug));
    return logs;
  }, [creditLogs, activeTenant, allowedTenants]);

  useEffect(() => {
    let cancelled = false;
    const fetchCredits = async () => {
      try {
        setCreditsLoading(true);
        setCreditsError(null);

        const walletQuery = supabase.from("tenants_wallets").select("tenant_slug, credit_balance, plan_type");
        const tenantsQuery = supabase.from("tenants").select("slug, name");
        const logsQuery = supabase
          .from("credit_logs")
          .select("tenant_slug, amount, feature, description, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        const logsMonthQuery = supabase
          .from("credit_logs")
          .select("tenant_slug, amount, created_at")
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);

        if (allowedTenants.length) {
          walletQuery.in("tenant_slug", allowedTenants);
          tenantsQuery.in("slug", allowedTenants);
          logsQuery.in("tenant_slug", allowedTenants);
          logsMonthQuery.in("tenant_slug", allowedTenants);
        }

        const settled = await Promise.allSettled([
          walletQuery,
          tenantsQuery,
          logsQuery,
          logsMonthQuery,
        ]);

        const pick = (r: PromiseSettledResult<any>) =>
          r.status === "fulfilled" ? r.value : { data: null, error: r.reason };

        const walletsRes  = pick(settled[0]);
        const tenantsRes  = pick(settled[1]);
        const logsRes     = pick(settled[2]);
        const logsMonthRes = pick(settled[3]);

        if (walletsRes.error)   console.warn("Wallets:", walletsRes.error);
        if (tenantsRes.error)   console.warn("Tenants:", tenantsRes.error);
        if (logsRes.error)      console.warn("Logs:", logsRes.error);
        if (logsMonthRes.error) console.warn("Logs mês:", logsMonthRes.error);

        const tenantsMap = new Map(
          (tenantsRes.data || []).map((t: any) => [t.slug, t.name])
        );

        const monthTotals = (logsMonthRes.data || []).reduce((acc: Record<string, number>, log: any) => {
          const key = log.tenant_slug;
          const val = Number(log.amount || 0);
          acc[key] = (acc[key] || 0) + val;
          return acc;
        }, {});

        const rows = (walletsRes.data || []).map((row: any) => ({
          ...row,
          name: tenantsMap.get(row.tenant_slug) || row.tenant_slug,
          month_delta: monthTotals[row.tenant_slug] || 0,
        }));

        const logs = (logsRes.data || []).map((log: any) => ({
          ...log,
          name: tenantsMap.get(log.tenant_slug) || log.tenant_slug,
        }));

        if (!cancelled) setCreditRows(rows);
        if (!cancelled) setCreditLogs(logs);
      } catch (err: any) {
        if (!cancelled) setCreditsError(err?.message || "Erro ao carregar créditos.");
      } finally {
        if (!cancelled) setCreditsLoading(false);
      }
    };

    fetchCredits();
    return () => {
      cancelled = true;
    };
  }, [allowedTenants.join("|")]);

  // Carrega membros do time a partir do Supabase
  useEffect(() => {
    const ROLE_TO_DEPT: Record<string, string> = {
      da: "arte", redator: "redacao", producao: "producao", atendimento: "atendimento",
    };
    const tenant = activeTenant && activeTenant !== "all" ? activeTenant : (allowedTenants[0] ?? null);
    if (!tenant) return;

    supabase
      .from("user_tenants")
      .select("user_id, role, profiles:user_id(name)")
      .eq("tenant_slug", tenant)
      .then(({ data, error }) => {
        if (error || !data) return;
        const members = (data as any[])
          .filter((r) => ROLE_TO_DEPT[r.role])
          .map((r, i) => ({
            id: r.user_id ?? String(i),
            name: (r.profiles as any)?.name ?? r.role,
            role: r.role,
            dept: ROLE_TO_DEPT[r.role],
          }));
        if (members.length) setTeamMembers(members);
      });
  }, [activeTenant, allowedTenants.join("|")]);

  // Carrega tarefas do usuário para o tenant selecionado
  const fetchTasks = useCallback(async () => {
    if (!user?.id) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let query = supabase
      .from("tasks")
      .select("*");

    if (activeTenant && activeTenant !== "all") {
      query = query.eq("tenant", activeTenant);
    } else if (allowedTenants.length) {
      query = query.in("tenant", allowedTenants);
    }

    if (allowedDepartments.length) {
      query = query.in("department", allowedDepartments);
    } else {
      query = query.eq("id", -1);
    }

    if (currentRole !== "admin") {
      query = query.or(`created_by.eq.${user.id},assignees.cs.{${user.id}}`);
    }

    const { data, error } = await query;
    if (error) {
      setTasks([]);
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  }, [activeTenant, user?.id, allowedTenants.join("|"), allowedDepartments.join("|"), currentRole, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await fetchTasks();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fetchTasks]);

  useEffect(() => {
    const filter =
      activeTenant && activeTenant !== "all" ? `tenant=eq.${activeTenant}` : undefined;

    const channel = supabase
      .channel(`realtime:dashboard_tasks:${activeTenant || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter },
        () => { fetchTasks(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTenant, fetchTasks]);

  // GESTÃO DE CAPACIDADE (Workload) — carregado do Supabase em teamMembers
  const DEPT_LOAD_WEIGHT: Record<string, number> = {
    arte: 15, redacao: 20, producao: 25, atendimento: 10,
  };
  const TEAM_METRICS = teamMembers.map((m) => ({
    ...m,
    load: (stats.byDept[m.dept as keyof typeof stats.byDept] ?? 0) * (DEPT_LOAD_WEIGHT[m.dept] ?? 10),
  }));

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden font-sans">
      
      {/* HEADER WAR ROOM */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-black/90 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold tracking-tighter">
            {activeTenant && activeTenant !== "all" ? activeTenant.toUpperCase() : "TODOS"}
            <span className="text-zinc-500 font-normal ml-2">| Command Center</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Sistemas Estáveis</span>
              <span className="text-[9px] text-zinc-600">Sync: Agora mesmo</span>
           </div>
           <div className="h-10 w-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center font-bold text-blue-500 shadow-inner">DP</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        
        {/* KPI TOP BAR */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
  {[
    { label: "Jobs em Aberto", val: stats.pending, color: "text-white", icon: Layers },
    { label: "Aguardando Aprovação", val: stats.critical, color: "text-orange-500", icon: Clock },
    { label: "Entregas (Mês)", val: stats.completed, color: "text-green-500", icon: CheckCircle2 },
    { label: "Ocupação Geral", val: "74%", color: "text-blue-500", icon: Activity }
  ].map((kpi, i) => {
    // 1. Atribuímos o componente a uma variável com letra maiúscula (padrão React)
    const IconComponent = kpi.icon;

    return (
      <div key={i} className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl relative group transition-all hover:border-zinc-700 shadow-2xl">
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
        <div className="flex items-end justify-between">
          <h3 className={`text-4xl font-black ${kpi.color}`}>{kpi.val}</h3>
          <div className="p-2 bg-zinc-900 rounded-xl text-zinc-700 group-hover:text-zinc-300 transition-colors">
            {/* 2. Renderizamos como componente real, passando a prop size sem erro */}
            <IconComponent size={20} />
          </div>
        </div>
      </div>
    );
  })}
</div>

        {/* MONITOR DE CRÉDITOS SAAS (Importante para não parar a produção) */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 mb-12 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" /> Monitor de Créditos
              </h3>
              <p className="text-[10px] text-zinc-600 mt-1 uppercase font-bold">
                Saldo de API por cliente
              </p>
            </div>
            {creditsLoading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
          </div>

          {creditsError ? (
            <div className="text-xs text-red-400">{creditsError}</div>
          ) : filteredCredits.length === 0 ? (
            <div className="text-xs text-zinc-500">Nenhum saldo encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCredits.map((row: any) => (
                <div
                  key={row.tenant_slug}
                  className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{row.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                      {row.plan_type || "standard"}
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const current = Number(row.credit_balance || 0);
                      const monthDelta = Number(row.month_delta || 0);
                      const initial = current - monthDelta;
                      const percent = initial > 0 ? Math.max(0, Math.min(100, (current / initial) * 100)) : 0;
                      return (
                        <>
                          <p className="text-lg font-black text-emerald-400">
                            {percent.toFixed(0)}%
                          </p>
                          <p className="text-[9px] text-zinc-600">
                            do saldo inicial do mês
                          </p>
                          <p className="text-[9px] text-zinc-700">
                            Saldo inicial: {Number(initial || 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-zinc-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">
                Extrato recente
              </p>
              <span className="text-[9px] text-zinc-600">
                Últimos 5 lançamentos
              </span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-xs text-zinc-600">Sem lançamentos.</div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.slice(0, 5).map((log: any, idx: number) => (
                  <div
                    key={`${log.tenant_slug}-${log.created_at}-${idx}`}
                    className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800 rounded-xl px-3 py-2"
                  >
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                        {log.name}
                      </p>
                      <p className="text-xs text-zinc-200">
                        {log.description || log.feature || "Uso de API"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${Number(log.amount) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {Number(log.amount || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                      <p className="text-[9px] text-zinc-600">
                        {log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DASHBOARD OPERACIONAL CENTRAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
           
           {/* COLUNA 1: ATENÇÃO NECESSÁRIA (ALERTAS) */}
           <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col h-[450px] shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500"/> Atenção Necessária
                </h3>
                <Badge className="bg-red-600 animate-pulse">{stats.critical}</Badge>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {/* Alerta de SLA */}
                {stats.critical > 0 && (
                  <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-black bg-orange-500 text-black px-2 py-0.5 rounded">GARGALO</span>
                       <Timer className="w-3 h-3 text-orange-500" />
                    </div>
                    <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                       Há {stats.critical} peças paradas em aprovação há mais de 24h.
                    </p>
                  </div>
                )}

                {/* Alerta de Equipe */}
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded">CAPACIDADE</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                       Danilo (Arte) atingiu 90% da carga diária. Novos jobs sofrerão atraso.
                    </p>
                </div>
              </div>
           </div>

           {/* COLUNA 2: HEATMAP DE DEPARTAMENTOS (SUBSTITUI O FINANCEIRO) */}
           <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col h-[450px] shadow-2xl">
              <div className="mb-8">
                 <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500"/> Pressão por Departamento</h3>
                 <p className="text-[10px] text-zinc-600 mt-1 uppercase font-bold">Onde o fluxo está acumulando hoje?</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-8">
                 {[
                   { label: 'Redação', val: stats.byDept.redacao, color: 'bg-pink-500', total: 10 },
                   { label: 'Arte / Imagem', val: stats.byDept.arte, color: 'bg-blue-500', total: 10 },
                   { label: 'RTV / Vídeo', val: stats.byDept.producao, color: 'bg-cyan-500', total: 10 }
                 ].map((dept, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-black uppercase text-zinc-400 tracking-tighter">{dept.label}</span>
                         <span className="text-xs font-mono text-zinc-500">{dept.val} jobs</span>
                      </div>
                      <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                         <div 
                           className={`h-full ${dept.color} transition-all duration-1000`} 
                           style={{ width: `${(dept.val / dept.total) * 100}%` }}
                         ></div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* COLUNA 3: LIVE PRODUCTION (Atividade Recente) */}
           {/* ... (mantenha seu componente de Live Production, ele é ótimo para ver o que a IA está cuspindo agora) ... */}

        </div>

        {/* GESTÃO DE WORKLOAD (Ajustado para seu time real) */}
        <div className="pb-20">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-8 tracking-[0.3em] flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" /> Human Resource Workload
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {TEAM_METRICS.map(member => {
                    const isOver = member.load > 80;
                    return (
                        <div key={member.id} className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl hover:border-zinc-700 transition shadow-2xl">
                            <div className="flex items-center gap-4 mb-6">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isOver ? 'bg-red-500 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
                                  {member.name.charAt(0)}
                               </div>
                               <div>
                                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{member.name}</h4>
                                  <p className="text-[9px] text-zinc-600 font-bold uppercase">{member.role}</p>
                               </div>
                            </div>
                            
                            <div className="space-y-2">
                               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                  <span>Carga</span>
                                  <span className={isOver ? 'text-red-500' : 'text-blue-500'}>{member.load}%</span>
                               </div>
                               <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${Math.min(member.load, 100)}%` }}
                                  ></div>
                               </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>
      
      {/* INSIGHT IA (Rodapé) */}
      <footer className="h-12 bg-zinc-950 border-t border-zinc-900 px-8 flex items-center gap-4 text-zinc-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse"/>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] truncate">
            Mugô Agência: "Atenção ao RTV. Rodrigo está com 3 vídeos em fila paralela. Recomendo priorizar o job da Voy Saúde."
          </p>
      </footer>
    </div>
  );
}

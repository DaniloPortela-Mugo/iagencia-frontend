import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Users, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/useAuth";

type Client = {
  id: string; // UUID
  name: string | null;
};

type MetricRow = {
  id: string;
  client_id: string;
  platform: string | null;
  metric_date: string;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  engagement: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

export default function Performance() {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // ✅ clients é VIEW no seu banco → não filtra por created_by e nem ordena por created_at
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,name")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Client[];
    },
    // se você quiser exigir login para ver isso:
    enabled: !!user?.id,
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["performanceMetrics", selectedClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_metrics")
        .select(
          "id,client_id,platform,metric_date,followers,reach,impressions,engagement,likes,comments,shares"
        )
        .eq("client_id", selectedClientId)
        .order("metric_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
    enabled: !!selectedClientId,
  });

  const totals = useMemo(() => {
    const base = {
      followers: 0,
      reach: 0,
      impressions: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    if (!metrics?.length) return base;

    return metrics.reduce((acc, m) => {
      acc.followers += m.followers ?? 0;
      acc.reach += m.reach ?? 0;
      acc.impressions += m.impressions ?? 0;
      acc.engagement += m.engagement ?? 0;
      acc.likes += m.likes ?? 0;
      acc.comments += m.comments ?? 0;
      acc.shares += m.shares ?? 0;
      return acc;
    }, base);
  }, [metrics]);

  const kpis = [
    { title: "Seguidores Totais", value: totals.followers, icon: Users, description: "Soma dos registros" },
    { title: "Alcance", value: totals.reach, icon: TrendingUp, description: "Soma dos registros" },
    { title: "Impressões", value: totals.impressions, icon: Eye, description: "Soma dos registros" },
    { title: "Engajamento", value: totals.engagement, icon: Heart, description: "Soma dos registros" },
  ];

  const engagementMetrics = [
    { title: "Curtidas", value: totals.likes, icon: Heart },
    { title: "Comentários", value: totals.comments, icon: MessageCircle },
    { title: "Compartilhamentos", value: totals.shares, icon: Share2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground mt-2">Acompanhe as métricas e KPIs das redes sociais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione o Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder={clientsLoading ? "Carregando..." : "Escolha um cliente"} />
            </SelectTrigger>
            <SelectContent>
              {(clients ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name ?? "Sem nome"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!!selectedClientId && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpi.value.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Engajamento</CardTitle>
              <CardDescription>Interações dos usuários com o conteúdo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {engagementMetrics.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.title} className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{m.title}</p>
                        <p className="text-2xl font-bold">{m.value.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métricas por Plataforma</CardTitle>
              <CardDescription>Desempenho em cada rede social</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando métricas...</p>
              ) : metrics && metrics.length > 0 ? (
                <div className="space-y-4">
                  {metrics.map((m) => (
                    <div key={m.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{m.platform ?? "plataforma"}</h4>
                        <span className="text-sm text-muted-foreground">
                          {new Date(m.metric_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Seguidores</p>
                          <p className="font-medium">{(m.followers ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Alcance</p>
                          <p className="font-medium">{(m.reach ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Impressões</p>
                          <p className="font-medium">{(m.impressions ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Engajamento</p>
                          <p className="font-medium">{(m.engagement ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma métrica registrada ainda.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

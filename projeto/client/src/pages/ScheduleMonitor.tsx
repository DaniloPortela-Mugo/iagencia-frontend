import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Activity, RefreshCw, Calendar as CalendarIcon, Search } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type ScheduleItem = {
  id: string;
  title: string;
  status: "Agendado" | "Publicado" | "Falhou";
  when: Date;
  channel: "Instagram" | "TikTok" | "YouTube" | "Site";
};

const seed: ScheduleItem[] = [
  { id: "a1", title: "Reels - Bastidores", status: "Agendado", when: new Date(), channel: "Instagram" },
  { id: "a2", title: "Post - Carrossel PIT", status: "Publicado", when: new Date(Date.now() - 86400000), channel: "Instagram" },
  { id: "a3", title: "Short - Corte Entrevista", status: "Falhou", when: new Date(Date.now() - 2 * 86400000), channel: "YouTube" },
];

const chartData = [
  { day: "Seg", ok: 3, fail: 0 },
  { day: "Ter", ok: 5, fail: 1 },
  { day: "Qua", ok: 4, fail: 0 },
  { day: "Qui", ok: 6, fail: 0 },
  { day: "Sex", ok: 2, fail: 1 },
  { day: "Sáb", ok: 1, fail: 0 },
  { day: "Dom", ok: 2, fail: 0 },
];

function pill(status: ScheduleItem["status"]) {
  if (status === "Publicado") return "default";
  if (status === "Falhou") return "destructive";
  return "outline";
}

export default function ScheduleMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return seed;
    return seed.filter((i) => (i.title + " " + i.channel + " " + i.status).toLowerCase().includes(query));
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            <h1 className="text-3xl font-semibold">Monitor de Agendamentos</h1>
          </div>
          <p className="text-muted-foreground">Tela estável (base). Depois a gente liga com dados reais do backend.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Auto</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          <Button variant="outline" onClick={() => alert("Depois ligamos refresh real (fetch / supabase).")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saúde da Operação (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ok" />
                <Line type="monotone" dataKey="fail" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buscar</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Ex: instagram, falhou, reels..." />
            </div>
            <Button variant="outline" onClick={() => setQ("")}>
              Limpar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fila</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-3">
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(it.when, "dd 'de' MMM 'às' HH:mm", { locale: ptBR })} • {it.channel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pill(it.status) as any}>{it.status}</Badge>
                    <Button variant="outline" onClick={() => alert(`Abrir ${it.id} (vamos ligar depois).`)}>
                      Abrir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

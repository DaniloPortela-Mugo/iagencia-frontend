import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { asUuid } from "@/lib/id";

export default function ClientDetails() {
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ id: string }>("/clients/:id");
  const clientId = useMemo(() => asUuid(params?.id), [params?.id]);

  const enabled = !!clientId;

  const clientQuery =
    // se você ainda não tiver clientProfile no trpc, troca isso por trpc.clients.list e filtra
    (trpc as any).clientProfile?.get?.useQuery
      ? (trpc as any).clientProfile.get.useQuery({ clientId }, { enabled })
      : ({ data: null } as any);

  if (!clientId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Cliente</h1>
        <p className="text-muted-foreground">ID inválido na URL.</p>
        <Button variant="outline" onClick={() => navigate("/clients")}>Voltar</Button>
      </div>
    );
  }

  const c = clientQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{c?.name ?? "Cliente"}</h1>
          <p className="text-muted-foreground mt-2">{c?.description ?? ""}</p>
        </div>

        <Button variant="outline" onClick={() => navigate("/clients")}>Voltar</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate(`/pit?clientId=${clientId}`)}>
          <CardHeader>
            <CardTitle>PIT</CardTitle>
            <CardDescription>Pedidos Internos de Trabalho</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Abrir PIT deste cliente</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate(`/production?clientId=${clientId}`)}>
          <CardHeader>
            <CardTitle>Produção</CardTitle>
            <CardDescription>Eventos e entregas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Abrir Produção deste cliente</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate(`/creation?clientId=${clientId}`)}>
          <CardHeader>
            <CardTitle>Criação</CardTitle>
            <CardDescription>Conteúdos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Abrir Criação deste cliente</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate(`/clients/${clientId}/config`)}>
          <CardHeader>
            <CardTitle>Config</CardTitle>
            <CardDescription>Configuração de campanha</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Abrir configurações</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

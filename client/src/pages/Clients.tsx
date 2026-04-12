import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getMyWorkspaceId } from "@/lib/workspace";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type UUID = string;

type ClientRow = {
  id: UUID;
  name: string;
  description: string | null;
  status: string;
};

type ProductionEvent = {
  id: UUID;
  workspace_id: UUID;
  client_id: UUID | null;
  title: string;
  status: string;
  description: string | null;
  date_start: string | null;
  date_end: string | null;
  created_by: UUID | null;
  created_at: string;
  updated_at: string;
};

function getClientIdFromLocation(loc: string): string | null {
  const q = loc.split("?")[1] ?? "";
  const params = new URLSearchParams(q);
  return params.get("clientId");
}

export default function Production() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // ✅ clientId reativo ao location (não fica travado)
  const clientId = useMemo(() => getClientIdFromLocation(location), [location]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<UUID | "">(clientId ?? "");

  const [formData, setFormData] = useState({
    title: "",
    status: "todo",
    description: "",
    date_start: "",
    date_end: "",
  });

  // Clients (para seletor)
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<ClientRow[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,description,status")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  // Workspace
  const { data: workspaceId, isLoading: isWorkspaceLoading } = useQuery({
    queryKey: ["workspaceId"],
    queryFn: async () => {
      const id = await getMyWorkspaceId();
      if (!id) throw new Error("Workspace não encontrado para este usuário.");
      return id;
    },
  });

  const effectiveClientId: UUID | null = (selectedClientId || null) as any;

  const { data: events, isLoading, error } = useQuery<ProductionEvent[]>({
    queryKey: ["production_events", workspaceId, effectiveClientId],
    enabled: !!workspaceId && !!effectiveClientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_events")
        .select("id,workspace_id,client_id,title,status,description,date_start,date_end,created_by,created_at,updated_at")
        .eq("workspace_id", workspaceId!)
        .eq("client_id", effectiveClientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ProductionEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não carregado.");
      if (!effectiveClientId) throw new Error("Selecione um cliente.");

      const title = formData.title.trim();
      if (!title) throw new Error("Título é obrigatório.");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const payload = {
        workspace_id: workspaceId,
        client_id: effectiveClientId,
        title,
        status: formData.status || "todo",
        description: formData.description.trim() || null,
        date_start: formData.date_start ? new Date(formData.date_start).toISOString() : null,
        date_end: formData.date_end ? new Date(formData.date_end).toISOString() : null,
        created_by: authData?.user?.id ?? null,
      };

      const { error } = await supabase.from("production_events").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Evento criado");
      await queryClient.invalidateQueries({ queryKey: ["production_events", workspaceId, effectiveClientId] });
      setIsDialogOpen(false);
      setFormData({ title: "", status: "todo", description: "", date_start: "", date_end: "" });
    },
    onError: (err: any) => toast.error("Erro ao criar: " + (err?.message ?? "Erro")),
  });

  const updateStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await supabase.from("production_events").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["production_events", workspaceId, effectiveClientId] });
    },
    onError: (err: any) => toast.error("Erro ao atualizar: " + (err?.message ?? "Erro")),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Evento excluído");
      await queryClient.invalidateQueries({ queryKey: ["production_events", workspaceId, effectiveClientId] });
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + (err?.message ?? "Erro")),
  });

  // ✅ Se chegou sem clientId: mostra seletor (igual Criação)
  if (!effectiveClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Produção</h1>
          <p className="text-muted-foreground mt-2">
            Selecione um cliente para ver/criar eventos.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecione o Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedClientId} onValueChange={(v) => setSelectedClientId(v)}>
              <SelectTrigger className="w-full md:w-[320px]">
                <SelectValue placeholder="Escolha um cliente" />
              </SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                disabled={!selectedClientId}
                onClick={() => setLocation(`/production?clientId=${selectedClientId}`)}
              >
                Abrir Produção
              </Button>
              <Button variant="outline" onClick={() => setLocation("/clients")}>
                Voltar para Clientes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produção</h1>
          <p className="text-muted-foreground mt-2">
            {isWorkspaceLoading ? "Carregando workspace..." : "Eventos do cliente selecionado"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>Novo Evento</DialogTitle>
              <DialogDescription>Crie um evento para este cliente</DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] px-6 pb-6">
              <form
                id="production-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  createEvent.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Título *</Label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Input
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    placeholder="todo | doing | done"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="datetime-local"
                      value={formData.date_start}
                      onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input
                      type="datetime-local"
                      value={formData.date_end}
                      onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                    />
                  </div>
                </div>
              </form>
            </ScrollArea>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="production-form" disabled={createEvent.isPending || !workspaceId}>
                {createEvent.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <p className="text-destructive">Erro: {(error as any)?.message ?? "Erro ao carregar"}</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Carregando eventos...</p>
      ) : events && events.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{ev.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteEvent.mutate(ev.id)}
                    disabled={deleteEvent.isPending}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardTitle>
                <CardDescription className="truncate">{ev.description ?? ""}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={ev.status === "todo" ? "default" : "outline"}
                      onClick={() => updateStatus.mutate({ id: ev.id, status: "todo" })}
                      disabled={updateStatus.isPending}
                    >
                      Todo
                    </Button>
                    <Button
                      size="sm"
                      variant={ev.status === "doing" ? "default" : "outline"}
                      onClick={() => updateStatus.mutate({ id: ev.id, status: "doing" })}
                      disabled={updateStatus.isPending}
                    >
                      Doing
                    </Button>
                    <Button
                      size="sm"
                      variant={ev.status === "done" ? "default" : "outline"}
                      onClick={() => updateStatus.mutate({ id: ev.id, status: "done" })}
                      disabled={updateStatus.isPending}
                    >
                      Done
                    </Button>
                  </div>
                </div>

                {(ev.date_start || ev.date_end) ? (
                  <div className="text-sm text-muted-foreground">
                    {ev.date_start ? `Início: ${new Date(ev.date_start).toLocaleString()}` : ""}
                    {ev.date_end ? ` • Fim: ${new Date(ev.date_end).toLocaleString()}` : ""}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Nenhum evento cadastrado para este cliente.</p>
      )}
    </div>
  );
}

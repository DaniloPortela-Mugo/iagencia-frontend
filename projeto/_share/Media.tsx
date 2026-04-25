import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

type Uuid = string;

type BroadcastForm = {
  clientId: Uuid;
  channelId: string; // pode ser uuid ou int dependendo da tabela (mantive string)
  title: string;
  insertionsCount: string; // string do input
  duration: string; // string do input
  costPerInsertion: string; // string do input
  notes: string;
};

export default function Media() {
  const [selectedClientId, setSelectedClientId] = useState<Uuid | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [broadcastForm, setBroadcastForm] = useState<BroadcastForm>({
    clientId: "",
    channelId: "",
    title: "",
    insertionsCount: "1",
    duration: "30",
    costPerInsertion: "",
    notes: "",
  });

  const utils = trpc.useUtils();

  const { data: clients } = trpc.clients.list.useQuery();

  const { data: channels } = trpc.mediaChannels.listByClientId.useQuery(
    { clientId: selectedClientId as Uuid },
    { enabled: !!selectedClientId }
  );

  const { data: broadcasts, isLoading } = trpc.mediaBroadcasts.listByClientId.useQuery(
    { clientId: selectedClientId as Uuid },
    { enabled: !!selectedClientId }
  );

  const createBroadcast = trpc.mediaBroadcasts.create.useMutation({
    onSuccess: async () => {
      toast.success("Veiculação criada!");
      await utils.mediaBroadcasts.listByClientId.invalidate();
      setIsDialogOpen(false);
      setBroadcastForm({
        clientId: selectedClientId ?? "",
        channelId: "",
        title: "",
        insertionsCount: "1",
        duration: "30",
        costPerInsertion: "",
        notes: "",
      });
    },
    onError: (e) => toast.error("Erro ao criar: " + e.message),
  });

  const deleteBroadcast = trpc.mediaBroadcasts.delete.useMutation({
    onSuccess: async () => {
      toast.success("Veiculação removida!");
      await utils.mediaBroadcasts.listByClientId.invalidate();
    },
    onError: (e) => toast.error("Erro ao excluir: " + e.message),
  });

  const channelsOptions = useMemo(() => channels ?? [], [channels]);
  const broadcastsList = useMemo(() => broadcasts ?? [], [broadcasts]);

  const handleOpenCreate = () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente primeiro");
      return;
    }
    setBroadcastForm((p) => ({ ...p, clientId: selectedClientId }));
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return toast.error("Selecione um cliente");
    if (!broadcastForm.title.trim()) return toast.error("Título é obrigatório");
    if (!broadcastForm.channelId) return toast.error("Selecione um canal");

    const insertions = Number(broadcastForm.insertionsCount || "1");
    const duration = Number(broadcastForm.duration || "30");
    const costPerInsertion = broadcastForm.costPerInsertion ? Number(broadcastForm.costPerInsertion) : null;

    createBroadcast.mutate({
      clientId: selectedClientId,
      channelId: broadcastForm.channelId,
      title: broadcastForm.title.trim(),
      insertionsCount: Number.isFinite(insertions) ? insertions : 1,
      duration: Number.isFinite(duration) ? duration : 30,
      costPerInsertion,
      notes: broadcastForm.notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mídia</h1>
          <p className="text-muted-foreground mt-2">
            Planeje canais e veiculações (TV, rádio, etc).
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedClientId ?? "all"}
            onValueChange={(v) => setSelectedClientId(v === "all" ? null : (v as Uuid))}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Selecione um cliente…</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name ?? "Sem nome"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nova veiculação
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova veiculação</DialogTitle>
                <DialogDescription>Crie um item de veiculação para o cliente selecionado</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Canal *</Label>
                    <Select
                      value={broadcastForm.channelId}
                      onValueChange={(v) => setBroadcastForm((p) => ({ ...p, channelId: v }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {channelsOptions.map((ch: any) => (
                          <SelectItem key={String(ch.id)} value={String(ch.id)}>
                            {ch.name ?? ch.title ?? `Canal ${ch.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!channelsOptions || channelsOptions.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        Sem canais para esse cliente (ou tabela ainda não criada no Supabase).
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm((p) => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Inserções</Label>
                    <Input
                      inputMode="numeric"
                      value={broadcastForm.insertionsCount}
                      onChange={(e) => setBroadcastForm((p) => ({ ...p, insertionsCount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (seg)</Label>
                    <Input
                      inputMode="numeric"
                      value={broadcastForm.duration}
                      onChange={(e) => setBroadcastForm((p) => ({ ...p, duration: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo/Inserção</Label>
                    <Input
                      inputMode="decimal"
                      value={broadcastForm.costPerInsertion}
                      onChange={(e) => setBroadcastForm((p) => ({ ...p, costPerInsertion: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={broadcastForm.notes}
                    onChange={(e) => setBroadcastForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createBroadcast.isPending}>
                    {createBroadcast.isPending ? "Salvando..." : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedClientId ? (
        <Card>
          <CardHeader>
            <CardTitle>Selecione um cliente</CardTitle>
            <CardDescription>Para ver canais e veiculações</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Veiculações</CardTitle>
            <CardDescription>Itens cadastrados para o cliente selecionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : broadcastsList.length > 0 ? (
              broadcastsList.map((b: any) => (
                <div key={String(b.id)} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.title ?? "Sem título"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Canal: {b.channel_id ?? b.channelId ?? "-"} • Inserções: {b.insertions_count ?? b.insertionsCount ?? "-"} • Duração:{" "}
                      {b.duration ?? "-"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteBroadcast.mutate({ id: String(b.id) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma veiculação cadastrada.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

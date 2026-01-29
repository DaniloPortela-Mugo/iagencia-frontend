import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell } from "lucide-react";
import { Link } from "wouter";

export default function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/notifications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações de Notificações</h1>
          <p className="text-muted-foreground mt-2">
            Em manutenção (schema no Supabase).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações desativadas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Quando criarmos a tabela <code>notification_settings</code> e migrarmos <code>notifications</code> para UUID,
          essa tela volta completa.
        </CardContent>
      </Card>
    </div>
  );
}

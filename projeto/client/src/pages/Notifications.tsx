import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft, Settings } from "lucide-react";
import { Link } from "wouter";

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
            <p className="text-muted-foreground mt-2">
              Em manutenção (ajuste de schema no Supabase).
            </p>
          </div>
        </div>

        <Link href="/notifications/settings">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Nenhuma notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Assim que a tabela de notificações estiver alinhada (UUID), isso volta a funcionar.
        </CardContent>
      </Card>
    </div>
  );
}

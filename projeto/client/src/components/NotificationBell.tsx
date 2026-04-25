import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Users,
  Info,
  Check,
  Trash2,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

type NotificationType =
  | "event_reminder"
  | "pit_assigned"
  | "content_approved"
  | "content_rejected"
  | "team_confirmation"
  | "system";

type DbNotification = {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string; // ISO
};

const notificationIcons: Record<
  NotificationType,
  { icon: any; color: string }
> = {
  event_reminder: { icon: Calendar, color: "text-blue-500" },
  pit_assigned: { icon: FileText, color: "text-purple-500" },
  content_approved: { icon: CheckCircle, color: "text-green-500" },
  content_rejected: { icon: XCircle, color: "text-red-500" },
  team_confirmation: { icon: Users, color: "text-amber-500" },
  system: { icon: Info, color: "text-gray-500" },
};

async function fetchNotifications(): Promise<DbNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,message,is_read,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as DbNotification[];
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotif = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (n: DbNotification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}

            <Link href="/notifications/settings">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((n) => {
                const typeKey = (n.type as NotificationType) in notificationIcons
                  ? (n.type as NotificationType)
                  : "system";

                const typeInfo = notificationIcons[typeKey];
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={n.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 ${typeInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              !n.is_read ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {n.title}
                          </p>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotif.mutate(n.id);
                            }}
                            aria-label="Deletar notificação"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {n.message}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>

                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
              <p className="text-xs">Você está em dia!</p>
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Link href="/notifications">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setIsOpen(false)}
              >
                Ver todas as notificações
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

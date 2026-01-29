import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MessageSquare, FileText, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ActivityItem {
  id: string;
  user_name: string;
  action_type: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

const ActivityHistory: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType: string, entityType?: string) => {
    switch (actionType) {
      case 'message_sent':
      case 'message_read':
        return <MessageSquare className="w-4 h-4" />;
      case 'brief_created':
      case 'brief_updated':
        return <FileText className="w-4 h-4" />;
      case 'client_added':
      case 'client_updated':
        return <User className="w-4 h-4" />;
      case 'time_tracked':
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'message_sent':
        return 'bg-blue-100 text-blue-800';
      case 'message_read':
        return 'bg-green-100 text-green-800';
      case 'brief_created':
      case 'brief_updated':
        return 'bg-purple-100 text-purple-800';
      case 'client_added':
      case 'client_updated':
        return 'bg-orange-100 text-orange-800';
      case 'time_tracked':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Agora há pouco';
    if (hours < 24) return `${hours}h atrás`;
    if (hours < 48) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Histórico de Atividades</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade registrada
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(activity.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{activity.user_name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getActivityColor(activity.action_type)}`}
                    >
                      <span className="mr-1">{getActivityIcon(activity.action_type, activity.entity_type)}</span>
                      {activity.action_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(activity.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHistory;
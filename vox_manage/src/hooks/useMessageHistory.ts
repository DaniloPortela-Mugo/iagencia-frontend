import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  from_user: string;
  to_user: string;
  subject: string;
  content: string;
  message_type: 'internal' | 'client';
  read_status: boolean;
  attachments: any[];
  created_at: string;
}

export const useMessageHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (messageData: Omit<Message, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      
      setMessages(prev => [data, ...prev]);
      await logActivity('message_sent', `Mensagem enviada para ${messageData.to_user}`);
      
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_status: true })
        .eq('id', messageId);

      if (error) throw error;
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read_status: true } : msg
        )
      );
      
      await logActivity('message_read', 'Mensagem marcada como lida');
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const logActivity = async (actionType: string, description: string, entityId?: string) => {
    try {
      await supabase
        .from('activity_history')
        .insert([{
          user_name: 'Usuário Atual', // Replace with actual user
          action_type: actionType,
          description: description,
          entity_type: 'message',
          entity_id: entityId
        }]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  return {
    messages,
    loading,
    saveMessage,
    markAsRead,
    loadMessages
  };
};
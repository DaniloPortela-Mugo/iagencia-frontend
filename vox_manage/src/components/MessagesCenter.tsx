import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageCircle, Paperclip, X, Download, History } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useMessageHistory } from '@/hooks/useMessageHistory';
import ActivityHistory from './ActivityHistory';

interface Attachment {
  id: string;
  name: string;
  size: number;
  url: string;
}

const MessagesCenter: React.FC = () => {
  const { clients = [], teamMembers = [] } = useApp();
  const { messages, loading, saveMessage, markAsRead } = useMessageHistory();
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'history'>('inbox');
  const [newMessage, setNewMessage] = useState({
    to: '',
    subject: '',
    content: '',
    type: 'internal' as 'internal' | 'client'
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (messageId: string): Promise<Attachment[]> => {
    const uploadedAttachments: Attachment[] = [];
    
    for (const file of attachments) {
      const fileName = `${messageId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);

        uploadedAttachments.push({
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          url: urlData.publicUrl
        });
      }
    }
    
    return uploadedAttachments;
  };

  const sendMessage = async () => {
    if (!newMessage.to || !newMessage.subject || !newMessage.content) return;
    
    setUploading(true);
    try {
      const messageId = Date.now().toString();
      const messageAttachments = await uploadAttachments(messageId);

      await saveMessage({
        from_user: 'Você',
        to_user: newMessage.to,
        subject: newMessage.subject,
        content: newMessage.content,
        message_type: newMessage.type,
        read_status: true,
        attachments: messageAttachments
      });

      setNewMessage({ to: '', subject: '', content: '', type: 'internal' });
      setAttachments([]);
      setActiveTab('inbox');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleMarkAsRead = (messageId: string) => {
    markAsRead(messageId);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Agora há pouco';
    if (hours < 24) return `${hours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const unreadCount = messages.filter(m => !m.read_status).length;

  if (loading) {
    return <div className="text-center py-8">Carregando mensagens...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Central de Mensagens</h2>
          <p className="text-muted-foreground">Comunicação com equipe e clientes</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={activeTab === 'inbox' ? 'default' : 'outline'}
            onClick={() => setActiveTab('inbox')}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Caixa de Entrada
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant={activeTab === 'compose' ? 'default' : 'outline'}
            onClick={() => setActiveTab('compose')}
          >
            <Send className="w-4 h-4 mr-2" />
            Nova Mensagem
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </div>
      </div>

      {activeTab === 'history' && <ActivityHistory />}

      {activeTab === 'compose' && (
        <Card>
          <CardHeader>
            <CardTitle>Compor Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={newMessage.type} onValueChange={(value: 'internal' | 'client') => setNewMessage({...newMessage, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de mensagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Equipe Interna</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newMessage.to} onValueChange={(value) => setNewMessage({...newMessage, to: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Destinatário" />
                </SelectTrigger>
                <SelectContent>
                  {newMessage.type === 'internal' 
                    ? teamMembers.map(member => (
                        <SelectItem key={member} value={member}>{member}</SelectItem>
                      ))
                    : clients.map(client => (
                        <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Assunto"
              value={newMessage.subject}
              onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
            />

            <Textarea
              placeholder="Mensagem"
              value={newMessage.content}
              onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
              rows={6}
            />

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Anexar Arquivo
                  </label>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={sendMessage} className="w-full" disabled={uploading}>
              <Send className="w-4 h-4 mr-2" />
              {uploading ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card 
              key={message.id} 
              className={`cursor-pointer transition-colors ${!message.read_status ? 'border-blue-200 bg-blue-50/50' : ''}`}
              onClick={() => handleMarkAsRead(message.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Avatar>
                    <AvatarFallback>{getInitials(message.from_user)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{message.from_user}</h4>
                        <Badge variant={message.message_type === 'client' ? 'default' : 'secondary'}>
                          {message.message_type === 'client' ? 'Cliente' : 'Equipe'}
                        </Badge>
                        {!message.read_status && <Badge variant="destructive">Nova</Badge>}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <h5 className="font-medium text-sm">{message.subject}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.content}
                    </p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.attachments.map((attachment: any) => (
                          <div key={attachment.id} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded text-xs">
                            <Paperclip className="w-3 h-3" />
                            <span>{attachment.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(attachment.url, '_blank');
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesCenter;
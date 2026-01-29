import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, User, MessageSquare, Edit, Plus } from 'lucide-react';
import { useBriefHistory, Brief } from '@/hooks/useBriefHistory';
import { toast } from 'sonner';
import BriefFilters from './BriefFilters';
import NewBriefForm from './NewBriefForm';

interface BriefHistoryProps {
  clientId: string;
  clientName: string;
}

const BriefHistory: React.FC<BriefHistoryProps> = ({ clientId, clientName }) => {
  const { briefs, loading, updateBrief, addBrief } = useBriefHistory(clientId);
  const [editingBrief, setEditingBrief] = useState<string | null>(null);
  const [editData, setEditData] = useState({ status: '', comments: '' });
  const [showNewForm, setShowNewForm] = useState(false);
  
  // Filter and sort states
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered and sorted briefs
  const filteredBriefs = useMemo(() => {
    let filtered = briefs.filter(brief => {
      const matchesStatus = statusFilter === 'all' || brief.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || brief.priority === priorityFilter;
      const matchesSearch = searchTerm === '' || 
        brief.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brief.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brief.responsible_party?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesPriority && matchesSearch;
    });

    // Sort briefs
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Brief];
      let bValue: any = b[sortBy as keyof Brief];
      
      if (sortBy === 'deadline') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[aValue as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[bValue as keyof typeof priorityOrder] || 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [briefs, statusFilter, priorityFilter, searchTerm, sortBy, sortOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in-progress': return 'Em Andamento';
      case 'approved': return 'Aprovado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      default: return priority;
    }
  };

  const handleEditStart = (brief: Brief) => {
    setEditingBrief(brief.id);
    setEditData({ status: brief.status, comments: brief.comments || '' });
  };

  const handleEditSave = async (briefId: string) => {
    try {
      await updateBrief(briefId, editData);
      setEditingBrief(null);
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleEditCancel = () => {
    setEditingBrief(null);
    setEditData({ status: '', comments: '' });
  };

  const handleNewBrief = async (briefData: any) => {
    await addBrief(briefData);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchTerm('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Histórico de Briefs - {clientName}</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Histórico de Briefs - {clientName}</h2>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Brief
        </Button>
      </div>

      {showNewForm && (
        <NewBriefForm
          clientId={clientId}
          clientName={clientName}
          onBriefCreated={() => setShowNewForm(false)}
          onCancel={() => setShowNewForm(false)}
          onSubmit={handleNewBrief}
        />
      )}

      <BriefFilters
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        searchTerm={searchTerm}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusFilterChange={setStatusFilter}
        onPriorityFilterChange={setPriorityFilter}
        onSearchChange={setSearchTerm}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
      />

      {filteredBriefs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {briefs.length === 0 
                ? 'Nenhum brief encontrado para este cliente.' 
                : 'Nenhum brief corresponde aos filtros aplicados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredBriefs.map((brief) => (
          <Card key={brief.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{brief.title}</CardTitle>
                  {brief.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {brief.description}
                    </p>
                  )}
                </div>
                <Badge className={getStatusColor(brief.status)}>
                  {getStatusText(brief.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {brief.responsible_party || 'Não atribuído'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {brief.deadline ? new Date(brief.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                  </span>
                </div>
                <div className="text-sm">
                  Prioridade: {getPriorityText(brief.priority)}
                </div>
              </div>

              {editingBrief === brief.id ? (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={editData.status} 
                        onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in-progress">Em Andamento</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Comentários</Label>
                    <Textarea
                      value={editData.comments}
                      onChange={(e) => setEditData(prev => ({ ...prev, comments: e.target.value }))}
                      placeholder="Adicione comentários sobre o brief..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditSave(brief.id)}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleEditCancel}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  {brief.comments && (
                    <div className="flex items-start gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{brief.comments}</p>
                    </div>
                  )}
                  <Button size="sm" onClick={() => handleEditStart(brief)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Alterar Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default BriefHistory;
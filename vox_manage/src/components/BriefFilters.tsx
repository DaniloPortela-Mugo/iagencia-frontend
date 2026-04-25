import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface BriefFiltersProps {
  statusFilter: string;
  priorityFilter: string;
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onStatusFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

const BriefFilters: React.FC<BriefFiltersProps> = ({
  statusFilter,
  priorityFilter,
  searchTerm,
  sortBy,
  sortOrder,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSearchChange,
  onSortChange,
  onClearFilters
}) => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filtros e Ordenação</h3>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          <X className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar briefs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in-progress">Em Andamento</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={`${sortBy}-${sortOrder}`} 
          onValueChange={(value) => {
            const [field, order] = value.split('-');
            onSortChange(field, order as 'asc' | 'desc');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Mais Recente</SelectItem>
            <SelectItem value="created_at-asc">Mais Antigo</SelectItem>
            <SelectItem value="deadline-asc">Prazo (Próximo)</SelectItem>
            <SelectItem value="deadline-desc">Prazo (Distante)</SelectItem>
            <SelectItem value="title-asc">Título (A-Z)</SelectItem>
            <SelectItem value="title-desc">Título (Z-A)</SelectItem>
            <SelectItem value="priority-desc">Prioridade (Alta-Baixa)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BriefFilters;
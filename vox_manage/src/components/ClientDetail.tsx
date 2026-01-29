import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BriefHistory from './BriefHistory';

interface Client {
  id: string;
  name: string;
  industry: string;
  color: string;
}

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
}

const ClientDetail: React.FC<ClientDetailProps> = ({ client, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: client.color }}>
            {client.name}
          </h1>
          <p className="text-muted-foreground">{client.industry}</p>
        </div>
      </div>

      <BriefHistory clientId={client.id} clientName={client.name} />
    </div>
  );
};

export default ClientDetail;
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from './LoginForm';
import Navigation from './Navigation';
import Dashboard from './Dashboard';
import ClientDetail from './ClientDetail';
import TemplatesManager from './TemplatesManager';
import TimeTracker from './TimeTracker';
import MessagesCenter from './MessagesCenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp, Client } from '@/contexts/AppContext';

const ClientsView: React.FC<{ onClientSelect: (client: Client) => void }> = ({ onClientSelect }) => {
  const { clients, briefs } = useApp();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Clientes</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => {
          const clientProjects = briefs.filter(b => b.clientId === client.id).length;
          return (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onClientSelect(client)}
            >
              <CardHeader>
                <CardTitle style={{ color: client.color }}>{client.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{client.industry}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm font-medium">Status: {client.status === 'active' ? 'Ativo' : 'Inativo'}</p>
                  <p className="text-sm text-muted-foreground">{clientProjects} projetos</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const AnalyticsView: React.FC = () => {
  const { briefs, clients, getTeamMembers } = useApp();
  const teamMembers = getTeamMembers();
  const completionRate = briefs.length > 0 ? (briefs.filter(b => b.status === 'completed').length / briefs.length * 100).toFixed(1) : 0;
  
  const teamStats = teamMembers.map(member => ({
    name: member,
    projects: briefs.filter(b => b.assignedTo === member).length,
    completed: briefs.filter(b => b.assignedTo === member && b.status === 'completed').length
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Análises</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <p className="text-sm text-muted-foreground">
              {briefs.filter(b => b.status === 'completed').length} de {briefs.length} projetos concluídos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clients.map(client => (
                <div key={client.id} className="flex justify-between">
                  <span>{client.name}</span>
                  <span>{briefs.filter(b => b.clientId === client.id).length} projetos</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Performance da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamStats.map(member => (
                <div key={member.name} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <span className="font-medium">{member.name}</span>
                    <p className="text-sm text-muted-foreground">
                      {member.completed} concluídos de {member.projects} projetos
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {member.projects > 0 ? ((member.completed / member.projects) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('clients');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderContent = () => {
    if (activeTab === 'clients' && selectedClient) {
      return <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'clients': return <ClientsView onClientSelect={setSelectedClient} />;
      case 'analytics': return <AnalyticsView />;
      case 'templates': return <TemplatesManager />;
      case 'time': return <TimeTracker />;
      case 'messages': return <MessagesCenter />;
      default: return <ClientsView onClientSelect={setSelectedClient} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="container mx-auto py-6 px-4">
        {renderContent()}
      </main>
    </div>
  );
};

export default AppLayout;
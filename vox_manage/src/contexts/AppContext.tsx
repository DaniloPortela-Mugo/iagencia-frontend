import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Client {
  id: string;
  name: string;
  industry: string;
  color: string;
  status: 'active' | 'inactive';
}

export interface Brief {
  id: string;
  title: string;
  description: string;
  clientId: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'approved' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  assignedTo?: string;
  comments?: string;
}

interface AppContextType {
  clients: Client[];
  briefs: Brief[];
  addBrief: (brief: Omit<Brief, 'id' | 'createdAt'>) => void;
  updateBrief: (id: string, updates: Partial<Brief>) => void;
  getClientById: (id: string) => Client | undefined;
  getTeamMembers: () => string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const mockClients: Client[] = [
  { id: '1', name: 'Cliente_1', industry: 'Farmácia', color: '#3B82F6', status: 'active' },
  { id: '2', name: 'Carol Graber', industry: 'Saúde', color: '#10B981', status: 'active' },
  { id: '3', name: 'Cliente 3', industry: 'Varejo', color: '#F59E0B', status: 'active' },
  { id: '4', name: 'Cliente 4', industry: 'Financeiro', color: '#8B5CF6', status: 'active' },
  { id: '5', name: 'Cliente 5', industry: 'Educação', color: '#EF4444', status: 'active' },
  { id: '6', name: 'Cliente 6', industry: 'Alimentação', color: '#EC4899', status: 'active' }
];

const teamMembers = ['Danilo', 'Bruno', 'Julia', 'Kleber'];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients] = useState<Client[]>(mockClients);
  const [briefs, setBriefs] = useState<Brief[]>([]);

  const addBrief = (briefData: Omit<Brief, 'id' | 'createdAt'>) => {
    const newBrief: Brief = {
      ...briefData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setBriefs(prev => [...prev, newBrief]);
  };

  const updateBrief = (id: string, updates: Partial<Brief>) => {
    setBriefs(prev => prev.map(brief => 
      brief.id === id ? { ...brief, ...updates } : brief
    ));
  };

  const getClientById = (id: string) => {
    return clients.find(client => client.id === id);
  };

  const getTeamMembers = () => teamMembers;

  return (
    <AppContext.Provider value={{
      clients,
      briefs,
      addBrief,
      updateBrief,
      getClientById,
      getTeamMembers
    }}>
      {children}
    </AppContext.Provider>
  );
};
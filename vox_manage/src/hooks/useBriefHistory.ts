import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Brief {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  responsible_party: string | null;
  status: string;
  deadline: string | null;
  priority: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export const useBriefHistory = (clientId?: string) => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefs = async (clientId?: string) => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('briefs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setBriefs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching briefs');
      console.error('Error fetching briefs:', err);
    } finally {
      setLoading(false);
    }
  };

  const addBrief = async (briefData: Omit<Brief, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('briefs')
        .insert([briefData])
        .select()
        .single();

      if (error) throw error;
      
      setBriefs(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding brief');
      console.error('Error adding brief:', err);
      throw err;
    }
  };

  const updateBrief = async (id: string, updates: Partial<Brief>) => {
    try {
      const { data, error } = await supabase
        .from('briefs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setBriefs(prev => prev.map(brief => 
        brief.id === id ? data : brief
      ));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating brief');
      console.error('Error updating brief:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchBriefs(clientId);
    }
  }, [clientId]);

  return {
    briefs,
    loading,
    error,
    fetchBriefs,
    addBrief,
    updateBrief,
    refetch: () => fetchBriefs(clientId)
  };
};
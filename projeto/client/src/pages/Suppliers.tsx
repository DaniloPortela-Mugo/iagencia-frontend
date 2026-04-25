import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  Truck,
  Speaker,
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  X,
  Building2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";

const CATEGORIES = [
  { id: "pessoal", label: "Pessoal & Staff", icon: Users, color: "text-blue-400" },
  { id: "equipamento", label: "Equipamento", icon: Speaker, color: "text-purple-400" },
  { id: "infra", label: "Infraestrutura", icon: Truck, color: "text-orange-400" },
  { id: "legal", label: "Legal & Burocracia", icon: FileText, color: "text-red-400" },
];

export default function Suppliers() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    tenant_slug: "",
    name: "",
    category: "pessoal",
    specialty: "",
    cnpj_cpf: "",
    email: "",
    phone: "",
    address: "",
    cost_base: 0,
  });

  const internalAdmins = new Set([
    "36026e4f-d53c-422a-ae79-313f25eda530",
    "819e636b-68ca-4288-9503-6587351edc49",
    "e6132232-1d18-411f-a3dc-915f6d592b2a",
  ]);
  const { user, activeTenant } = useAuth();

  useEffect(() => {
    const loadTenants = async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("name", { ascending: true });
      if (error) return;
      let tenantList = (data || []).filter((t: any) => t.is_active !== false);
      if (user?.id && !internalAdmins.has(user.id)) {
        tenantList = tenantList.filter(t => t.slug !== "mugo-ag");
      }
      setTenants(tenantList);
      if (activeTenant && activeTenant !== "all") {
        setFormData(prev => ({ ...prev, tenant_slug: activeTenant }));
      }
    };
    loadTenants();
  }, [user?.id, activeTenant]);

  useEffect(() => {
    if (!activeTenant || activeTenant === "all") {
      setSuppliers([]);
      return;
    }
    setFormData(prev => ({ ...prev, tenant_slug: activeTenant }));
    loadSuppliers(activeTenant);
  }, [activeTenant]);

  const loadSuppliers = async (tenantSlug: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${API_URL}/library/suppliers?tenant_slug=${tenantSlug}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = await res.json();
      setSuppliers(data);
      setIsOffline(false);
    } catch {
      console.warn("Backend offline. Usando modo visual apenas.");
      setIsOffline(true);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.specialty) {
      toast.warning("Preencha Nome e Especialidade.");
      return;
    }

    const payload = { ...formData, tenant_slug: activeTenant };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${API_URL}/admin/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro no servidor");

      toast.success(`Salvo em ${tenants.find(t => t.slug === activeTenant)?.name || activeTenant}!`);
      if (activeTenant) loadSuppliers(activeTenant);
    } catch {
      const newLocalSupplier = {
        ...payload,
        id: formData.id || `temp-${Date.now()}`,
      };
      setSuppliers(prev => {
        if (formData.id) {
          return prev.map(s => s.id === formData.id ? newLocalSupplier : s);
        }
        return [...prev, newLocalSupplier];
      });
      toast.warning("Modo Offline: Salvo temporariamente no navegador.", {
        description: "O servidor Python parece estar desligado.",
      });
    } finally {
      setIsEditing(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este fornecedor?")) return;
    setSuppliers(prev => prev.filter(s => s.id !== id));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      await fetch(`${API_URL}/admin/suppliers/${id}?tenant_slug=${activeTenant}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      toast.success("Removido.");
    } catch {
      toast.warning("Removido apenas visualmente (Offline).");
    }
  };

  const handleEdit = (sup: any) => {
    setFormData(sup);
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({
      id: "",
      tenant_slug: activeTenant || "",
      name: "",
      category: "pessoal",
      specialty: "",
      cnpj_cpf: "",
      email: "",
      phone: "",
      address: "",
      cost_base: 0,
    });
  };

  const filteredList = suppliers.filter(
    s => s.name.toLowerCase().includes(filter.toLowerCase()) || s.specialty.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
            <ShieldCheck className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Fornecedores
              {isOffline && <Badge variant="destructive" className="text-[10px] flex gap-1"><WifiOff className="w-3 h-3"/> OFFLINE</Badge>}
            </h1>
            <p className="text-zinc-500 text-sm">Banco de Talentos por Cliente</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg">
            <Building2 className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-white">
              {tenants.find(t => t.slug === activeTenant)?.name || activeTenant || "Selecione um cliente"}
            </span>
          </div>

          <Button
            onClick={() => { resetForm(); setIsEditing(true); }}
            disabled={!activeTenant || activeTenant === "all"}
            className="bg-green-600 hover:bg-green-500 text-white font-bold gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Novo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <Input
                placeholder={`Buscar fornecedores da ${tenants.find(t=>t.slug===activeTenant)?.name || activeTenant || "empresa"}...`}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white focus:border-green-500 placeholder:text-zinc-600"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredList.map((sup) => {
              const cat = CATEGORIES.find(c => c.id === sup.category) || CATEGORIES[0];
              const Icon = cat.icon;
              return (
                <div key={sup.id} className="group flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl hover:border-zinc-600 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black border border-zinc-800 ${cat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{sup.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-zinc-950 border-zinc-800 text-zinc-400">{sup.specialty}</Badge>
                        {sup.cost_base > 0 && <span className="text-[10px] text-green-400 font-mono">Ref: R$ {sup.cost_base}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] text-zinc-500">{sup.email || "Sem email"}</p>
                      <p className="text-[10px] text-zinc-500">{sup.phone || "Sem tel"}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleEdit(sup)}><Edit3 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => handleDelete(sup.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredList.length === 0 && (
              <div className="text-center py-10 text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
                {isOffline ? "Nenhum fornecedor local." : "Nenhum fornecedor cadastrado."}
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="col-span-12 lg:col-span-4 animate-in slide-in-from-right-10">
            <Card className="bg-zinc-900 border-zinc-700 sticky top-6 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-950/50 rounded-t-xl">
                <CardTitle className="text-sm font-bold text-white">{formData.id ? "Editar Registro" : "Novo Cadastro"}</CardTitle>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={() => setIsEditing(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Categoria & Especialidade</label>
                  <div className="flex gap-2">
                    <select className="bg-black border border-zinc-700 rounded-md p-2 text-xs text-white w-1/3 outline-none focus:border-green-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <Input placeholder="Ex: Diretor de Fotografia" className="bg-black border-zinc-700 h-9 text-xs text-white placeholder:text-zinc-600" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome / Razão Social</label>
                  <Input className="bg-black border-zinc-700 h-9 text-xs text-white font-bold placeholder:text-zinc-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-3 h-3 text-green-600" /><span className="text-[10px] font-bold text-green-600 uppercase">Dados Administrativos</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="CNPJ / CPF" className="bg-black border-zinc-700 h-8 text-xs text-white placeholder:text-zinc-600" value={formData.cnpj_cpf} onChange={e => setFormData({...formData, cnpj_cpf: e.target.value})} />
                    <Input type="number" placeholder="Custo Base (R$)" className="bg-black border-zinc-700 h-8 text-xs text-white placeholder:text-zinc-600" value={formData.cost_base || ''} onChange={e => setFormData({...formData, cost_base: parseFloat(e.target.value)})} />
                  </div>
                  <Input placeholder="Email Contato" className="bg-black border-zinc-700 h-8 text-xs text-white placeholder:text-zinc-600" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <Input placeholder="Telefone / WhatsApp" className="bg-black border-zinc-700 h-8 text-xs text-white placeholder:text-zinc-600" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  <Input placeholder="Endereço / Cidade" className="bg-black border-zinc-700 h-8 text-xs text-white placeholder:text-zinc-600" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-500 font-bold text-xs h-10 text-white">
                  <Save className="w-4 h-4 mr-2" /> {isOffline ? "Salvar (Offline)" : `Salvar em ${tenants.find(t=>t.slug===activeTenant)?.name || activeTenant}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

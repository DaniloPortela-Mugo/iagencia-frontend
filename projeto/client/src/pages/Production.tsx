import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Icons
import { 
  Clapperboard, CalendarClock, Users, DollarSign, 
  Wand2, Save, Phone, Truck, FileText, Speaker,
  Siren, ShieldAlert, CheckCircle2, Printer // <--- Adicionado Printer
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_URL = "http://localhost:8000";

// Mapa de Categorias para Ícones e Cores (Orçamento)
const CATEGORY_CONFIG: any = {
    pessoal: { label: "Pessoal & Staff", icon: Users, color: "text-blue-400", bg: "bg-blue-900/20" },
    equipamento: { label: "Equipamento & Técnica", icon: Speaker, color: "text-purple-400", bg: "bg-purple-900/20" },
    infra: { label: "Infraestrutura & Serviços", icon: Truck, color: "text-orange-400", bg: "bg-orange-900/20" },
    legal: { label: "Legal & Alvarás", icon: FileText, color: "text-red-400", bg: "bg-red-900/20" },
};

export default function Production() {
  const [brief, setBrief] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  // Busca Fornecedores
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*");
      return data || [];
    },
  });

  const handleGeneratePlan = async () => {
    if (!brief || !eventDate) {
      toast.warning("Preencha o briefing e a data.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/production/plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, date: eventDate }),
      });
      const data = await res.json();
      setPlan(data);
      toast.success("Plano Gerado com Análise de Riscos!");
    } catch (error) { toast.error("Erro na IA. Verifique o backend."); } finally { setIsProcessing(false); }
  };

  const groupBudget = (lines: any[]) => {
      return lines.reduce((acc: any, item: any) => {
          const cat = item.category || 'outros';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
      }, {});
  };

  // Função simples de imprimir
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 flex flex-col gap-6">
      
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-6 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-900/30 rounded-lg"><Clapperboard className="w-8 h-8 text-orange-500" /></div>
          <div><h1 className="text-2xl font-bold">Produção & RTV</h1><p className="text-zinc-500 text-sm">Planejamento Estratégico com Radar de Riscos</p></div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* INPUT (Escondido na impressão para focar no plano) */}
        <div className="w-full lg:w-1/3 space-y-6 print:hidden">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wand2 className="w-4 h-4 text-purple-400" /> Novo Briefing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">O que vamos produzir?</label>
                <Textarea placeholder="Ex: Gravação externa na rua, uso de drone, gerador e banheiros..." className="bg-black border-zinc-700 min-h-[120px] text-zinc-200" value={brief} onChange={(e) => setBrief(e.target.value)}/>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Data do Evento</label>
                <Input type="date" className="bg-black border-zinc-700 text-white" value={eventDate} onChange={(e) => setEventDate(e.target.value)}/>
              </div>
              <Button onClick={handleGeneratePlan} disabled={isProcessing} className="w-full bg-gradient-to-r from-orange-600 to-red-600 font-bold py-6">
                {isProcessing ? "Analisando Riscos..." : "Gerar Plano de Produção"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* OUTPUT */}
        <div className="flex-1 w-full">
          {!plan ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 p-10 text-zinc-500">
              <CalendarClock className="w-16 h-16 mb-4 opacity-20" /><p>Aguardando briefing...</p>
            </div>
          ) : (
            <Tabs defaultValue="timeline" className="h-full flex flex-col">
              
              {/* BARRA DE AÇÕES */}
              <div className="flex items-center justify-between mb-4 print:hidden">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                  <TabsTrigger value="timeline">Cronograma</TabsTrigger>
                  <TabsTrigger value="staff">Equipe</TabsTrigger> 
                  <TabsTrigger value="budget">Orçamento</TabsTrigger>
                  
                  {/* --- 4. ABA DE RISCOS --- */}
                  <TabsTrigger value="risks" className="data-[state=active]:bg-red-900/20 data-[state=active]:text-red-400">
                     <ShieldAlert className="w-4 h-4 mr-2" /> Radar de Riscos
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                    {/* BOTÃO IMPRIMIR */}
                    <Button variant="outline" onClick={handlePrint} className="border-zinc-700 text-zinc-300 hover:text-white gap-2">
                        <Printer className="w-4 h-4" /> Imprimir
                    </Button>
                    
                    <Button variant="outline" className="border-green-800 text-green-400 hover:bg-green-900/20 gap-2">
                        <Save className="w-4 h-4" /> Aprovar
                    </Button>
                </div>
              </div>

              {/* ABA 1: TIMELINE */}
              <TabsContent value="timeline" className="flex-1 overflow-y-auto space-y-3">
                <h2 className="hidden print:block text-black font-bold text-xl mb-4">Cronograma de Produção</h2>
                {plan.timeline.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-center bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg print:border-black print:bg-white print:text-black">
                     <div className="flex flex-col items-center justify-center w-14 h-14 bg-black rounded border border-zinc-800 print:bg-gray-100 print:border-gray-300"><span className="text-xl font-bold print:text-black">{item.date.split('/')[0]}</span></div>
                     <div><Badge variant="outline" className="mb-1 text-[10px] print:text-black print:border-black">{item.phase}</Badge><p className="text-sm font-medium print:text-black">{item.task}</p></div>
                  </div>
                ))}
              </TabsContent>

              {/* ABA 2: EQUIPE */}
              <TabsContent value="staff" className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <h2 className="hidden print:block text-black font-bold text-xl mb-4 col-span-2">Equipe e Fornecedores</h2>
                {plan.staff_needs && plan.staff_needs.length > 0 ? (
                  plan.staff_needs.map((staff: any, idx: number) => (
                    <Card key={idx} className="bg-zinc-900 border-zinc-800 print:bg-white print:border-black print:text-black">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex justify-between print:text-black">
                          {staff.role}
                          <Badge className="bg-zinc-800 text-white hover:bg-zinc-700 print:bg-gray-200 print:text-black">Qtd: {staff.qty}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Atribuir Fornecedor:</label>
                        <Select>
                          <SelectTrigger className="bg-black border-zinc-700 h-8 text-xs print:bg-white print:border-gray-300 print:text-black">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} (⭐ {s.rating})
                              </SelectItem>
                            ))}
                            <SelectItem value="new">+ Cadastrar Novo</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-zinc-500 py-10">Nenhuma equipe específica identificada.</div>
                )}
              </TabsContent>

              {/* ABA 3: ORÇAMENTO */}
              <TabsContent value="budget" className="flex-1 overflow-y-auto space-y-6">
                <h2 className="hidden print:block text-black font-bold text-xl mb-4">Orçamento Estimado</h2>
                {Object.entries(groupBudget(plan.budget_lines)).map(([catKey, items]: any) => {
                    const conf = CATEGORY_CONFIG[catKey] || { label: "Outros", icon: DollarSign, color: "text-gray-400", bg: "bg-gray-800" };
                    const CatIcon = conf.icon;
                    const catTotal = items.reduce((sum: number, i: any) => sum + i.est_cost, 0);

                    return (
                        <div key={catKey} className="space-y-2 print:break-inside-avoid">
                            <div className={`flex items-center justify-between px-4 py-2 rounded-t-lg border-t border-x border-zinc-800 ${conf.bg} print:bg-gray-100 print:border-black print:text-black`}>
                                <h3 className={`font-bold flex items-center gap-2 ${conf.color} print:text-black`}><CatIcon className="w-4 h-4" /> {conf.label}</h3>
                                <span className="text-xs font-mono text-zinc-400 print:text-black">Subtotal: {catTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-b-lg overflow-hidden print:bg-white print:border-black">
                                <table className="w-full text-sm">
                                    <thead className="bg-black text-zinc-500 text-xs uppercase print:bg-gray-200 print:text-black"><tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-right">Valor Est.</th></tr></thead>
                                    <tbody className="divide-y divide-zinc-800 print:divide-gray-300">
                                        {items.map((line: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-zinc-800/50 print:text-black">
                                                <td className="px-4 py-3 font-medium">{line.item}</td>
                                                <td className="px-4 py-3 text-right text-zinc-300 print:text-black">{line.est_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
                 <div className="flex justify-end mt-8 p-4 bg-orange-950/20 border border-orange-900/50 rounded-xl print:bg-white print:border-black print:text-black">
                    <div className="text-right"><span className="text-xs text-orange-400 uppercase font-bold block mb-1 print:text-black">Custo Total Estimado</span><span className="text-3xl font-bold text-white print:text-black">{plan.budget_lines.reduce((acc: number, curr: any) => acc + curr.est_cost, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                </div>
              </TabsContent>

              {/* ABA 4: RADAR DE RISCOS */}
              <TabsContent value="risks" className="flex-1 overflow-y-auto space-y-4">
                <h2 className="hidden print:block text-black font-bold text-xl mb-4">Análise de Riscos</h2>
                {plan.risks && plan.risks.length > 0 ? (
                  plan.risks.map((risk: any, idx: number) => (
                    <div key={idx} className={`border-l-4 p-4 rounded-r-lg bg-zinc-900/50 border-zinc-800 flex gap-4 ${risk.severity === 'high' ? 'border-l-red-600' : 'border-l-yellow-500'} print:bg-white print:border-black print:text-black`}>
                      <div className={`p-3 rounded-full h-fit ${risk.severity === 'high' ? 'bg-red-900/20 text-red-500' : 'bg-yellow-900/20 text-yellow-500'} print:bg-gray-200`}>
                        <Siren className="w-6 h-6 print:text-black" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg mb-1 ${risk.severity === 'high' ? 'text-red-400' : 'text-yellow-400'} print:text-black`}>
                          {risk.alert}
                        </h4>
                        <p className="text-sm text-zinc-400 mb-2 print:text-black">Plano de Contingência Sugerido:</p>
                        <div className="bg-black/40 p-3 rounded border border-zinc-800/50 text-sm text-zinc-200 flex items-start gap-2 print:bg-white print:border-gray-400 print:text-black">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0 print:text-black" />
                          {risk.solution}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <CheckCircle2 className="w-16 h-16 mb-4 text-green-900/50" />
                    <p>Nenhum risco crítico detectado pela IA neste briefing.</p>
                  </div>
                )}
              </TabsContent>

            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
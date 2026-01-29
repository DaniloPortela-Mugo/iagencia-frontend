import React, { useState } from "react";
import { useLocation } from "wouter";
import { 
  Globe, CheckCircle2, Sparkles, Loader2, 
  Upload, FileText, LayoutDashboard, BarChart3,
  PenTool, Clapperboard, Megaphone, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

// Módulos
const MODULES = [
  { id: "creation", label: "Criação (AI Studio)", icon: PenTool },
  { id: "planning", label: "Planejamento", icon: LayoutDashboard },
  { id: "media", label: "Mídia & GRP", icon: BarChart3 },
  { id: "production", label: "Produção RTV", icon: Clapperboard },
  { id: "atendimento", label: "Gestão Clientes", icon: Megaphone },
];

export default function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1); // 1: Fonte, 2: Módulos, 3: Final
  const [sourceType, setSourceType] = useState<'site' | 'file' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["creation"]);

  // Passo 1: Analisar (Site ou Arquivo)
  const handleAnalyze = () => {
    if (!companyName) return toast.error("Digite o nome da empresa.");
    setIsLoading(true);
    
    // Simula tempo de processamento da IA
    setTimeout(() => {
        setIsLoading(false);
        setStep(2);
        toast.success(sourceType === 'site' 
            ? "Site escaneado! Cores detectadas." 
            : "Dossiê processado! Tom de voz indexado."
        );
    }, 2500);
  };

  // Passo 2: Finalizar
  const handleFinish = () => {
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        toast.success("Ambiente IAgência criado!");
        setLocation("/"); // Vai para o Dashboard
    }, 1500);
  };

  const toggleModule = (id: string) => {
      setSelectedModules(prev => 
        prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden relative">
      
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none"></div>

      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* ESQUERDA: Interação */}
        <div className="space-y-8">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">I</div>
                    <span className="font-bold text-xl tracking-tight">IAgência</span>
                </div>
                <h1 className="text-4xl font-bold mb-3">Configuração do QG.</h1>
                <p className="text-zinc-400 text-lg">
                    {step === 1 ? "De onde a IA deve aprender sobre sua marca?" : "Quais superpoderes você precisa?"}
                </p>
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-300">Nome da Empresa / Candidato</label>
                        <Input 
                            value={companyName} onChange={e => setCompanyName(e.target.value)}
                            placeholder="Ex: PontoGov ou Voy Saúde" 
                            className="bg-zinc-900 border-zinc-800 h-12 text-lg"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setSourceType('site')}
                            className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${sourceType === 'site' ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                        >
                            <Globe className="w-8 h-8 text-blue-400" />
                            <span className="font-bold text-sm">Site Oficial</span>
                            <span className="text-[10px] text-zinc-500 text-center">Crawler extrai logo, cores e produtos.</span>
                        </button>

                        <button 
                            onClick={() => setSourceType('file')}
                            className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${sourceType === 'file' ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                        >
                            <Upload className="w-8 h-8 text-purple-400" />
                            <span className="font-bold text-sm">Upload Dossiê</span>
                            <span className="text-[10px] text-zinc-500 text-center">PDFs, Planos de Governo e Manuais.</span>
                        </button>
                    </div>

                    {sourceType === 'site' && (
                        <Input placeholder="www.suaempresa.com.br" className="bg-black border-zinc-800" />
                    )}
                    
                    {sourceType === 'file' && (
                        <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center bg-zinc-900/50">
                            <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                            <p className="text-sm text-zinc-500">Arraste seu PDF ou DOCX aqui</p>
                        </div>
                    )}

                    <Button 
                        onClick={handleAnalyze} disabled={isLoading || !sourceType || !companyName}
                        className="w-full h-12 font-bold bg-white text-black hover:bg-zinc-200"
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2 w-4 h-4"/>}
                        {isLoading ? "A IA está analisando..." : "Iniciar Análise"}
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {MODULES.map(mod => (
                            <div 
                                key={mod.id} onClick={() => toggleModule(mod.id)}
                                className={`p-4 rounded-xl border cursor-pointer flex items-center gap-4 transition-all ${selectedModules.includes(mod.id) ? 'bg-zinc-800 border-white' : 'bg-zinc-900/50 border-zinc-800 opacity-60'}`}
                            >
                                <div className={`p-2 rounded-lg ${selectedModules.includes(mod.id) ? 'bg-white text-black' : 'bg-black text-zinc-500'}`}>
                                    <mod.icon className="w-5 h-5"/>
                                </div>
                                <span className="font-bold flex-1">{mod.label}</span>
                                {selectedModules.includes(mod.id) && <CheckCircle2 className="text-green-500 w-5 h-5"/>}
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleFinish} disabled={isLoading} className="w-full h-12 font-bold bg-green-600 hover:bg-green-500 text-white">
                        {isLoading ? "Configurando..." : "Acessar Dashboard"}
                    </Button>
                </div>
            )}
        </div>

        {/* DIREITA: Visual Preview */}
        <div className="hidden lg:flex justify-center relative">
            {/* Círculo decorativo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-blue-900/30 to-purple-900/30 rounded-full blur-3xl -z-10"></div>
            
            <Card className="w-[400px] bg-black border border-zinc-800 shadow-2xl overflow-hidden relative">
                {/* Header Fake */}
                <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>

                <div className="p-8 flex flex-col items-center text-center space-y-6 min-h-[400px] justify-center">
                    
                    {step === 1 && !isLoading && (
                        <>
                            <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <ShieldCheck className="w-10 h-10 text-zinc-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Ambiente Seguro</h3>
                                <p className="text-sm text-zinc-500 mt-2">
                                    Seus dados de campanha ou corporativos são isolados em um Tenant exclusivo.
                                </p>
                            </div>
                        </>
                    )}

                    {isLoading && (
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse rounded-full"></div>
                                <Globe className="w-20 h-20 text-blue-500 animate-bounce relative z-10" />
                            </div>
                            <p className="text-sm font-mono text-blue-400">
                                {sourceType === 'site' ? "Extraindo CSS & Imagens..." : "Lendo PDF & Tom de Voz..."}
                            </p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="w-full space-y-4 animate-in zoom-in duration-300">
                             <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex items-center gap-4">
                                 <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center font-bold text-black text-xl">
                                     {companyName.charAt(0)}
                                 </div>
                                 <div className="text-left">
                                     <p className="font-bold text-white">{companyName}</p>
                                     <p className="text-xs text-zinc-500">Configuração detectada</p>
                                 </div>
                             </div>
                             
                             <div className="flex gap-2 justify-center">
                                 {['#18181b', '#2563eb', '#ffffff'].map(c => (
                                     <div key={c} className="w-8 h-8 rounded-full border border-white/10" style={{backgroundColor: c}}></div>
                                 ))}
                             </div>

                             <div className="text-xs text-zinc-500 pt-4 border-t border-zinc-800">
                                 "Tom de voz identificado: <span className="text-white">Profissional & Direto</span>"
                             </div>
                        </div>
                    )}

                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Wand2, Clapperboard, Download, Share2, 
  Sparkles, RefreshCw, Play, Image as ImageIcon,
  Smartphone, Monitor, Square, Music, UserSquare2,
  Upload, Palette, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StudioEditor from "@/components/StudioEditor"; // Certifique-se de ter o arquivo StudioEditor.tsx criado

// URL da API Python
const API_URL = "http://localhost:8000";

// MOCK: Em produção, isso vem do AuthContext
const CURRENT_TENANT_SLUG = "voy-saude"; 
const CURRENT_TENANT_NAME = "Voy Saúde";

export default function CreationDA() {
  // --- ESTADOS DE CONTROLE ---
  const [activeTab, setActiveTab] = useState("image"); // image | video | avatar | audio
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Novo: Controle de Qualidade (Veo vs Kling)
  const [qualityMode, setQualityMode] = useState<"standard" | "prime">("standard");

  // Estados de Avatar & Voz
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [audioSource, setAudioSource] = useState<"ai" | "upload">("ai");

  // Resultados
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null); // Para mostrar qual IA gerou

  // Carregar vozes do cliente ao iniciar
  useEffect(() => {
    async function fetchVoices() {
        try {
            const res = await fetch(`${API_URL}/creation/list-voices`, {
                method: 'POST', 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant_slug: CURRENT_TENANT_SLUG })
            });
            const data = await res.json();
            setVoices(data.voices || []);
            if (data.voices?.length > 0) setSelectedVoice(data.voices[0].id);
        } catch (e) { 
            console.error("Erro ao carregar vozes"); 
        }
    }
    fetchVoices();
  }, []);

  const handleGenerate = async () => {
    if (!prompt && activeTab !== 'avatar') return toast.warning("Descreva o que você quer criar.");
    
    setIsGenerating(true);
    setAssetUrl(null);
    setAudioUrl(null);
    setProviderUsed(null);

    try {
      let endpoint = "/creation/generate-image";
      let body: any = { 
          tenant_slug: CURRENT_TENANT_SLUG,
          ar: aspectRatio 
      };

      if (activeTab === 'image') {
          body.prompt_en = prompt;
          body.media_type = 'image';
      } 
      else if (activeTab === 'video') {
          body.prompt_en = prompt;
          body.media_type = 'video';
          body.quality_mode = qualityMode; // <--- ENVIA A ESCOLHA (VEO OU KLING)
      }
      else if (activeTab === 'audio') {
          endpoint = "/creation/generate-music";
          body.prompt = prompt;
      }
      else if (activeTab === 'avatar') {
          endpoint = "/creation/generate-avatar";
          body.image_url = "https://example.com/foto_base.jpg"; 
          body.audio_url = "https://example.com/audio.mp3";
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      if (data.url) setAssetUrl(data.url);
      if (data.audio_url) setAudioUrl(data.audio_url);
      if (data.provider) setProviderUsed(data.provider); // Backend devolve 'veo' ou 'kling'

      toast.success("Ativo gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro na comunicação com a IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 flex flex-col gap-6 relative">
      
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-900/30 rounded-lg"><Sparkles className="w-8 h-8 text-purple-500" /></div>
          <div>
              <h1 className="text-2xl font-bold">Estúdio de Criação</h1>
              <p className="text-zinc-500 text-sm">Geração de Ativos com IA</p>
          </div>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-900">
                Tenant: {CURRENT_TENANT_NAME}
            </Badge>
            <Badge className="bg-green-900/30 text-green-500 hover:bg-green-900/50">
                IA Conectada
            </Badge>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* INPUT (Painel de Controle) */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 h-full">
            <CardHeader className="pb-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full bg-black border border-zinc-800 grid grid-cols-4">
                        <TabsTrigger value="image"><ImageIcon className="w-4 h-4"/></TabsTrigger>
                        <TabsTrigger value="video"><Clapperboard className="w-4 h-4"/></TabsTrigger>
                        <TabsTrigger value="avatar"><UserSquare2 className="w-4 h-4"/></TabsTrigger>
                        <TabsTrigger value="audio"><Music className="w-4 h-4"/></TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              
              {/* --- SELETOR MODO PRIME (Só aparece em Vídeo) --- */}
              {activeTab === 'video' && (
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${qualityMode === 'prime' ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-500'}`}>
                              <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                              <p className={`text-xs font-bold ${qualityMode === 'prime' ? 'text-amber-500' : 'text-zinc-400'}`}>
                                  {qualityMode === 'prime' ? 'Modo Prime (Google Veo)' : 'Modo Standard (Kling)'}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                  {qualityMode === 'prime' ? 'Qualidade Cinema • Custo Alto' : 'Geração Rápida • Custo Baixo'}
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-1 bg-black rounded-full p-1 border border-zinc-800">
                          <button 
                              onClick={() => setQualityMode('standard')}
                              className={`text-[10px] px-3 py-1.5 rounded-full transition-all ${qualityMode === 'standard' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >Std</button>
                          <button 
                              onClick={() => setQualityMode('prime')}
                              className={`text-[10px] px-3 py-1.5 rounded-full transition-all font-bold ${qualityMode === 'prime' ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >Prime</button>
                      </div>
                  </div>
              )}
              {/* ----------------------------------------------- */}

              {/* Configuração Avatar */}
              {activeTab === 'avatar' && (
                  <div className="space-y-4 animate-in slide-in-from-left-2 mb-4 border-b border-zinc-800 pb-4">
                      <div className="p-3 bg-black rounded border border-zinc-800 text-center cursor-pointer hover:border-purple-500 transition-colors">
                          <UserSquare2 className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                          <p className="text-xs text-zinc-300">Selecionar Avatar Base</p>
                      </div>
                      <div className="space-y-2">
                          <Label className="text-xs uppercase text-zinc-500 font-bold">Fonte de Voz</Label>
                          <div className="flex bg-black rounded p-1 border border-zinc-800">
                              <button onClick={() => setAudioSource('ai')} className={`flex-1 text-xs py-2 rounded ${audioSource === 'ai' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}>IA (Texto)</button>
                              <button onClick={() => setAudioSource('upload')} className={`flex-1 text-xs py-2 rounded ${audioSource === 'upload' ? 'bg-purple-600 text-white' : 'text-zinc-400'}`}>Upload MP3</button>
                          </div>
                      </div>
                      {audioSource === 'ai' && (
                        <div className="space-y-2">
                            <Label className="text-[10px] text-zinc-500">Selecione a Voz</Label>
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                                <SelectTrigger className="bg-black border-zinc-700 h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {voices.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.category === 'cloned' ? '🧬 ' : '🎙️ '} {v.name}
                                        </SelectItem>
                                    ))}
                                    {voices.length === 0 && <SelectItem value="none" disabled>Nenhuma voz configurada</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                      )}
                  </div>
              )}

              {/* Área de Prompt */}
              {(activeTab !== 'avatar' || audioSource === 'ai') && (
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
                        {activeTab === 'audio' ? 'Estilo Musical' : 
                         activeTab === 'avatar' ? 'O que o avatar deve falar?' :
                         activeTab === 'video' ? 'Roteiro da Cena' : 'Descrição Visual'}
                    </label>
                    <Textarea 
                        placeholder={
                            activeTab === 'audio' ? "Ex: Trilha épica, estilo Hans Zimmer..." :
                            activeTab === 'video' ? "Ex: Casal correndo na praia... [NARRADOR]: Texto..." : 
                            "Ex: Garrafa de perfume flutuando..."
                        }
                        className="bg-black border-zinc-700 min-h-[140px] text-zinc-200 text-base resize-none focus:ring-purple-500" 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
              )}

              {/* Upload Avatar */}
              {activeTab === 'avatar' && audioSource === 'upload' && (
                  <div className="border-2 border-dashed border-zinc-800 rounded-lg p-6 text-center hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <Upload className="w-8 h-8 mx-auto text-zinc-500 mb-2"/>
                      <p className="text-xs text-zinc-400">Arraste o áudio gravado aqui</p>
                  </div>
              )}

              {/* Formato */}
              {activeTab !== 'audio' && (
                  <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Formato</label>
                      <div className="grid grid-cols-3 gap-2">
                          <Button type="button" variant="outline" onClick={() => setAspectRatio('16:9')} className={`text-xs h-10 ${aspectRatio === '16:9' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-zinc-700 bg-black text-zinc-400'}`}><Monitor className="w-4 h-4 mr-2"/> 16:9</Button>
                          <Button type="button" variant="outline" onClick={() => setAspectRatio('9:16')} className={`text-xs h-10 ${aspectRatio === '9:16' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-zinc-700 bg-black text-zinc-400'}`}><Smartphone className="w-4 h-4 mr-2"/> 9:16</Button>
                          <Button type="button" variant="outline" onClick={() => setAspectRatio('1:1')} className={`text-xs h-10 ${aspectRatio === '1:1' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-zinc-700 bg-black text-zinc-400'}`}><Square className="w-4 h-4 mr-2"/> 1:1</Button>
                      </div>
                  </div>
              )}

              <Button onClick={handleGenerate} disabled={isGenerating} className={`w-full font-bold py-6 text-md shadow-lg transition-all ${qualityMode === 'prime' && activeTab === 'video' ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90'}`}>
                {isGenerating ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin"/> {activeTab === 'audio' ? 'Compondo...' : 'Renderizando...'}</>
                ) : (
                    <><Wand2 className="w-5 h-5 mr-2"/> Gerar {activeTab === 'audio' ? 'Música' : 'Ativo'}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* OUTPUT (Preview) */}
        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden group">
             
             {!assetUrl && !isGenerating && (
                 <div className="text-center text-zinc-700">
                     {activeTab === 'audio' ? <Music className="w-20 h-20 mx-auto mb-4 opacity-20"/> : <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-20"/>}
                     <p>Aguardando comando...</p>
                 </div>
             )}

             {isGenerating && (
                 <div className="text-center space-y-6 animate-pulse z-10">
                     <div className="relative w-24 h-24 mx-auto">
                        <div className={`absolute inset-0 rounded-full border-4 ${qualityMode === 'prime' && activeTab === 'video' ? 'border-amber-500/30 border-t-amber-500' : 'border-purple-500/30 border-t-purple-500'} animate-spin`}></div>
                        <div className="absolute inset-2 rounded-full border-4 border-blue-500/20 border-b-blue-500 animate-spin direction-reverse"></div>
                     </div>
                     <div>
                        <p className="text-lg text-white font-medium">A IA está trabalhando</p>
                        <p className="text-xs text-zinc-500 mt-1">
                            {qualityMode === 'prime' && activeTab === 'video' ? 'Conectando ao Google Veo...' : 'Gerando pixels...'}
                        </p>
                     </div>
                 </div>
             )}

             {assetUrl && !isGenerating && (
                 <div className="w-full h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-500">
                     
                     {/* INDICADOR DE PROVEDOR (Novo) */}
                     {providerUsed && (
                         <Badge variant="outline" className={`absolute top-4 left-4 ${providerUsed === 'veo' ? 'border-amber-500 text-amber-500 bg-amber-950/30' : 'border-zinc-700 text-zinc-500 bg-black'}`}>
                             Gerado por: {providerUsed === 'veo' ? 'Google Veo 3' : 'Kling AI'}
                         </Badge>
                     )}

                     {activeTab === 'audio' ? (
                         <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-xl flex flex-col items-center gap-4 w-full max-w-lg shadow-2xl">
                             <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                 <Music className="w-10 h-10 text-white" />
                             </div>
                             <div className="text-center">
                                 <h3 className="font-bold text-white text-xl">Jingle / Trilha Gerada</h3>
                                 <audio src={assetUrl} controls className="w-full mt-2" />
                             </div>
                         </div>
                     ) : (
                         <div className="relative group max-w-full max-h-full">
                             {activeTab === 'image' ? (
                                 <img src={assetUrl} className="rounded-lg shadow-2xl max-h-[70vh] border border-zinc-800" />
                             ) : (
                                 <video src={assetUrl} controls className="max-w-full max-h-full rounded-lg shadow-2xl border border-zinc-800" autoPlay loop />
                             )}
                             
                             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 {activeTab === 'image' && (
                                     <Button 
                                         onClick={() => setIsEditorOpen(true)} 
                                         size="sm" 
                                         className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg gap-2"
                                     >
                                         <Palette className="w-4 h-4"/> Editar Peça
                                     </Button>
                                 )}
                                 <Button size="icon" variant="secondary" className="rounded-full shadow-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700">
                                     <Download className="w-4 h-4"/>
                                 </Button>
                             </div>
                         </div>
                     )}

                     {activeTab === 'video' && audioUrl && (
                         <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3 w-full max-w-md shadow-lg">
                             <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shrink-0">
                                 <Play className="w-5 h-5 ml-1" />
                             </div>
                             <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-white mb-0.5 truncate">Locução da Marca</p>
                                 <p className="text-[10px] text-zinc-500">ElevenLabs</p>
                             </div>
                             <audio src={audioUrl} controls className="h-8 w-24" />
                         </div>
                     )}
                 </div>
             )}
        </div>
      </div>

      {isEditorOpen && assetUrl && (
          <StudioEditor 
              baseImage={assetUrl}
              tenantName={CURRENT_TENANT_NAME}
              onClose={() => setIsEditorOpen(false)}
          />
      )}
    </div>
  );
}
import React, { useState } from "react";
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, 
  Download, Play, Save, Share2, LayoutTemplate 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Tipos de Layout de Slide
type SlideLayout = "cover" | "bullets" | "split" | "big-number";

interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  content: string[]; // Pontos ou texto corrido
  image?: string;    // URL opcional
  highlight?: string; // Para números grandes
}

// CORES DA MARCA (Vem do Contexto/Banco)
const BRAND_COLOR = "#2563eb"; // Azul Voy

export default function DeckBuilder() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  
  // ESTADO DOS SLIDES (Inicialmente vazio ou preenchido pela IA)
  const [slides, setSlides] = useState<Slide[]>([
    { id: "1", layout: "cover", title: "Campanha Verão 2026", content: ["Estratégia de Lançamento", "Espaço Laser"] },
    { id: "2", layout: "split", title: "O Problema", content: ["Homens têm vergonha de se cuidar.", "Pêlos encravados incomodam.", "Solução atual dói."], image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80" },
    { id: "3", layout: "big-number", title: "Meta de Alcance", content: ["Impacto esperado no primeiro mês"], highlight: "1.5M" },
    { id: "4", layout: "bullets", title: "Canais de Mídia", content: ["Instagram Reels (Foco em Humor)", "Google Search (Foco em Dor)", "Influencers Fitness"] },
  ]);

  const activeSlide = slides[currentSlideIndex];

  // AÇÕES
  const updateSlide = (field: keyof Slide, value: any) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...activeSlide, [field]: value };
    setSlides(newSlides);
  };

  const updateContent = (index: number, value: string) => {
    const newContent = [...activeSlide.content];
    newContent[index] = value;
    updateSlide("content", newContent);
  };

  const addSlide = () => {
    const newSlide: Slide = { 
        id: Math.random().toString(), 
        layout: "bullets", 
        title: "Novo Slide", 
        content: ["Clique para editar"] 
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const exportPPT = async () => {
      toast.info("Gerando arquivo PowerPoint...");
      // Aqui chamaria a API /planning/export-pptx que criamos antes
      // enviando o objeto `slides` como JSON.
  };

  // RENDERIZADOR DE LAYOUTS
  const renderSlideContent = () => {
      switch (activeSlide.layout) {
          case "cover":
              return (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-6" style={{backgroundColor: BRAND_COLOR}}>
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4">
                          <span className="font-bold text-2xl text-black">LOGO</span>
                      </div>
                      <Input 
                        value={activeSlide.title} 
                        onChange={e => updateSlide("title", e.target.value)}
                        className="text-5xl font-bold text-white bg-transparent border-none text-center placeholder:text-white/50 focus-visible:ring-0"
                      />
                      <Textarea 
                        value={activeSlide.content[0]}
                        onChange={e => updateContent(0, e.target.value)}
                        className="text-xl text-white/80 bg-transparent border-none text-center resize-none focus-visible:ring-0"
                      />
                  </div>
              );
          
          case "big-number":
               return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-white">
                      <Input 
                        value={activeSlide.title} onChange={e => updateSlide("title", e.target.value)}
                        className="text-3xl font-bold text-zinc-800 bg-transparent border-none text-center mb-8"
                      />
                      <Input 
                        value={activeSlide.highlight} onChange={e => updateSlide("highlight", e.target.value)}
                        className="text-[150px] font-black leading-none bg-transparent border-none text-center"
                        style={{color: BRAND_COLOR}}
                      />
                      <Textarea 
                        value={activeSlide.content[0]} onChange={e => updateContent(0, e.target.value)}
                        className="text-xl text-zinc-500 bg-transparent border-none text-center mt-4"
                      />
                  </div>
               );

          case "split":
              return (
                  <div className="grid grid-cols-2 h-full">
                      <div className="p-12 flex flex-col justify-center bg-zinc-50">
                          <Input 
                            value={activeSlide.title} onChange={e => updateSlide("title", e.target.value)}
                            className="text-4xl font-bold text-zinc-900 bg-transparent border-none mb-6"
                            style={{color: BRAND_COLOR}}
                          />
                          <div className="space-y-4">
                              {activeSlide.content.map((point, i) => (
                                  <div key={i} className="flex gap-3">
                                      <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{backgroundColor: BRAND_COLOR}} />
                                      <Textarea 
                                        value={point} onChange={e => updateContent(i, e.target.value)}
                                        className="text-lg text-zinc-600 bg-transparent border-none p-0 min-h-[40px] resize-none"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="bg-zinc-200 relative group overflow-hidden">
                          {activeSlide.image ? (
                              <img src={activeSlide.image} className="w-full h-full object-cover" />
                          ) : (
                              <div className="flex items-center justify-center h-full text-zinc-400">Sem Imagem</div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="secondary">Trocar Imagem</Button>
                          </div>
                      </div>
                  </div>
              );

          default: // Bullets (Padrão)
              return (
                  <div className="p-12 h-full bg-white flex flex-col">
                      <div className="border-b-4 pb-4 mb-8" style={{borderColor: BRAND_COLOR}}>
                          <Input 
                            value={activeSlide.title} onChange={e => updateSlide("title", e.target.value)}
                            className="text-4xl font-bold text-zinc-900 bg-transparent border-none p-0"
                          />
                      </div>
                      <div className="space-y-4 flex-1">
                          {activeSlide.content.map((point, i) => (
                              <div key={i} className="flex gap-4 items-start">
                                  <div className="w-3 h-3 mt-2.5 rounded-sm shrink-0" style={{backgroundColor: BRAND_COLOR}} />
                                  <Textarea 
                                    value={point} onChange={e => updateContent(i, e.target.value)}
                                    className="text-xl text-zinc-700 bg-transparent border-none p-1 resize-none"
                                  />
                              </div>
                          ))}
                          <Button variant="ghost" size="sm" className="text-zinc-400" onClick={() => updateSlide("content", [...activeSlide.content, "Novo ponto"])}>
                              <Plus className="w-4 h-4 mr-2"/> Adicionar Ponto
                          </Button>
                      </div>
                      
                      <div className="mt-auto pt-6 border-t flex justify-between text-xs text-zinc-400">
                           <span>Confidencial • Voy Saúde</span>
                           <span>{currentSlideIndex + 1} / {slides.length}</span>
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
        
        {/* SIDEBAR DE THUMBNAILS */}
        <div className="w-48 flex flex-col gap-3 overflow-y-auto pr-2">
            {slides.map((slide, idx) => (
                <div 
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`aspect-video rounded border-2 cursor-pointer relative group transition-all ${idx === currentSlideIndex ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-zinc-800 hover:border-zinc-600'}`}
                >
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                        <span className="text-[8px] text-zinc-500 px-2 text-center">{slide.title}</span>
                    </div>
                    <div className="absolute top-1 left-1 w-5 h-5 bg-black/50 text-white text-[10px] flex items-center justify-center rounded">
                        {idx + 1}
                    </div>
                    {/* Botão de Excluir só aparece no Hover */}
                    <button className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); /* lógica delete */ }}>
                        <Trash2 className="w-3 h-3"/>
                    </button>
                </div>
            ))}
            <Button variant="outline" className="w-full border-dashed border-zinc-700 hover:bg-zinc-900" onClick={addSlide}>
                <Plus className="w-4 h-4 mr-2"/> Novo Slide
            </Button>
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col gap-4">
            
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => updateSlide("layout", "cover")} title="Capa"><LayoutTemplate className="w-4 h-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => updateSlide("layout", "split")} title="Texto + Imagem"><ImageIcon className="w-4 h-4"/></Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setIsPresenting(true)}>
                        <Play className="w-4 h-4 mr-2"/> Apresentar
                    </Button>
                    <Button variant="outline" onClick={exportPPT}>
                        <Download className="w-4 h-4 mr-2"/> Baixar PPTX
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-500">
                        <Share2 className="w-4 h-4 mr-2"/> Compartilhar Link
                    </Button>
                </div>
            </div>

            {/* Canvas do Slide (Aspect Ratio 16:9 fixo) */}
            <div className="flex-1 bg-zinc-950 flex items-center justify-center p-8 border border-zinc-800 rounded-lg relative">
                <div className="aspect-video w-full max-w-5xl bg-white text-black shadow-2xl rounded overflow-hidden relative">
                    {renderSlideContent()}
                </div>
            </div>

        </div>
    </div>
  );
}
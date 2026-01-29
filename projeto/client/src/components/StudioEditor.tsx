import React, { useState, useRef } from "react";
import { 
  Type, Image as ImageIcon, Download, X, 
  Move, Trash2, Palette 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

// Definição de uma Camada (Layer)
interface Layer {
  id: number;
  type: 'text' | 'image';
  content: string; // Texto ou URL da imagem
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  width?: number; // Para logos
}

interface StudioEditorProps {
  baseImage: string; // A imagem gerada pela IA
  tenantName?: string; // Para simular o logo da marca
  onClose: () => void;
}

export default function StudioEditor({ baseImage, tenantName = "Marca", onClose }: StudioEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  
  // Encontra a camada selecionada atualmente
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // --- AÇÕES DE CAMADAS ---

  const addTextLayer = () => {
    const newId = Date.now();
    setLayers([...layers, { 
        id: newId, type: 'text', content: 'Edite este texto', 
        x: 50, y: 50, fontSize: 32, color: '#ffffff' 
    }]);
    setSelectedLayerId(newId);
  };

  const addLogoLayer = () => {
     // SIMULAÇÃO: Pega o logo do Tenant do banco de dados
     const mockLogoUrl = "https://cdn-icons-png.flaticon.com/512/732/732221.png"; // Exemplo genérico
     const newId = Date.now();
     setLayers([...layers, { 
         id: newId, type: 'image', content: mockLogoUrl, 
         x: 20, y: 20, width: 80 
     }]);
     setSelectedLayerId(newId);
     toast.success(`Logo da ${tenantName} adicionado!`);
  };

  const updateLayer = (id: number, changes: Partial<Layer>) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...changes } : l));
  };

  const deleteLayer = (id: number) => {
    setLayers(layers.filter(l => l.id !== id));
    setSelectedLayerId(null);
  };

  // Simulação de Drag and Drop simples (para MVP)
  // Em produção, usaríamos bibliotecas como dnd-kit ou react-draggable para fluidez.
  const handleDragEnd = (e: React.DragEvent, id: number) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Ajuste fino simples para centralizar o arraste
      updateLayer(id, { x: x - 50, y: y - 20 });
  };

  const handleDownload = () => {
      toast.loading("Renderizando arte final...");
      setTimeout(() => {
          toast.dismiss();
          toast.success("Imagem baixada com sucesso!");
          // Aqui entraria a lógica complexa de "tira print" da div (ex: html2canvas)
          // Para o MVP, o toast basta.
          onClose();
      }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[99] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      
      <div className="bg-zinc-900 w-full max-w-7xl h-[90vh] rounded-2xl border border-zinc-800 flex overflow-hidden shadow-2xl relative">
        
        {/* Botão Fechar */}
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 transition-colors">
            <X className="w-5 h-5 text-zinc-300"/>
        </button>

        {/* SIDEBAR ESQUERDA (Ferramentas) */}
        <div className="w-72 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto">
            <div>
                <h3 className="font-bold text-xl text-white flex items-center gap-2 mb-1">
                    <Palette className="w-5 h-5 text-purple-500"/> Studio Editor
                </h3>
                <p className="text-xs text-zinc-500">Finalize sua peça publicitária.</p>
            </div>
            
            <div className="space-y-3 pb-6 border-b border-zinc-800">
                <Label className="text-xs uppercase text-zinc-500 font-bold">Adicionar Elementos</Label>
                <Button onClick={addTextLayer} variant="outline" className="w-full justify-start bg-zinc-900 hover:bg-zinc-800 border-zinc-700">
                    <Type className="w-4 h-4 mr-2 text-purple-400"/> Texto
                </Button>
                <Button onClick={addLogoLayer} variant="outline" className="w-full justify-start bg-zinc-900 hover:bg-zinc-800 border-zinc-700">
                    <ImageIcon className="w-4 h-4 mr-2 text-blue-400"/> Logo do Cliente
                </Button>
            </div>

            {/* PAINEL DE PROPRIEDADES (Só aparece se algo estiver selecionado) */}
            {selectedLayer && selectedLayer.type === 'text' && (
                <div className="space-y-4 animate-in slide-in-from-left-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold flex justify-between">
                        Editar Texto
                        <Trash2 onClick={() => deleteLayer(selectedLayer.id)} className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400"/>
                    </Label>
                    
                    <div className="space-y-3">
                        <div>
                            <Label className="text-[10px]">Conteúdo</Label>
                            <Input 
                                value={selectedLayer.content}
                                onChange={e => updateLayer(selectedLayer.id, { content: e.target.value })}
                                className="bg-black border-zinc-700"
                            />
                        </div>
                        
                        <div>
                            <Label className="text-[10px] flex justify-between mb-1">Tamanho da Fonte <span>{selectedLayer.fontSize}px</span></Label>
                            <Slider 
                                value={[selectedLayer.fontSize || 16]} 
                                min={12} max={120} step={2}
                                onValueChange={([val]) => updateLayer(selectedLayer.id, { fontSize: val })}
                            />
                        </div>

                        <div>
                            <Label className="text-[10px]">Cor (Hex)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    type="color" value={selectedLayer.color}
                                    onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                                    className="w-10 h-10 p-1 bg-black border-zinc-700 cursor-pointer"
                                />
                                <Input 
                                    value={selectedLayer.color}
                                    onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                                    className="flex-1 bg-black border-zinc-700 font-mono uppercase"
                                    maxLength={7}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

             {selectedLayer && selectedLayer.type === 'image' && (
                <div className="space-y-4 animate-in slide-in-from-left-2">
                     <Label className="text-xs uppercase text-zinc-500 font-bold flex justify-between">
                        Editar Imagem/Logo
                        <Trash2 onClick={() => deleteLayer(selectedLayer.id)} className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400"/>
                    </Label>
                     <div>
                            <Label className="text-[10px] flex justify-between mb-1">Tamanho <span>{selectedLayer.width}px</span></Label>
                            <Slider 
                                value={[selectedLayer.width || 80]} min={40} max={400} step={5}
                                onValueChange={([val]) => updateLayer(selectedLayer.id, { width: val })}
                            />
                        </div>
                </div>
             )}

            <div className="mt-auto pt-4">
                <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-500 font-bold py-6">
                    <Download className="w-5 h-5 mr-2"/> Baixar Arte Final
                </Button>
            </div>
        </div>

        {/* ÁREA DO CANVAS (Centro) */}
        <div className="flex-1 bg-black/50 relative flex items-center justify-center p-8 overflow-hidden">
            
            {/* O "Papel" onde a arte é montada */}
            <div 
                ref={canvasRef}
                className="relative shadow-2xl shadow-black/50 ring-1 ring-zinc-800 max-h-full max-w-full aspect-[16/9] bg-zinc-800 overflow-hidden group/canvas select-none"
            >
                {/* Imagem Base (Fundo) */}
                <img src={baseImage} className="w-full h-full object-cover pointer-events-none" alt="Base generated by AI" />
                
                {/* Camadas Interativas */}
                {layers.map(layer => (
                    <div 
                        key={layer.id}
                        draggable="true"
                        onDragEnd={(e) => handleDragEnd(e, layer.id)}
                        onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                        className={`absolute cursor-move group/layer ${selectedLayerId === layer.id ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-white/50'}`}
                        style={{ 
                            top: layer.y, left: layer.x,
                            zIndex: selectedLayerId === layer.id ? 50 : 10
                        }}
                    >
                        {layer.type === 'text' ? (
                            <p style={{ color: layer.color, fontSize: layer.fontSize, fontWeight: 'bold', textShadow: '0px 2px 8px rgba(0,0,0,0.8)' }} className="whitespace-nowrap px-2 py-1">
                                {layer.content}
                            </label>
                        ) : (
                            <img src={layer.content} style={{ width: layer.width }} className="pointer-events-none drop-shadow-lg" />
                        )}

                        {/* Indicador de movimento (Hover) */}
                        <div className="absolute -top-3 -left-3 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover/layer:opacity-100 transition-opacity scale-75">
                            <Move className="w-3 h-3"/>
                        </div>
                    </div>
                ))}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur px-4 py-2 rounded-full text-xs text-zinc-400 border border-zinc-800 flex items-center gap-2">
                <Move className="w-3 h-3 animate-pulse"/> Clique para selecionar. Arraste para mover.
            </div>
        </div>

      </div>
    </div>
  );
}
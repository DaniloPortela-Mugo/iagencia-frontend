import React, { useState } from "react";
import { toast } from "sonner";
import { 
  Grid, List, Search, Download, Share2, 
  MoreVertical, Image as ImageIcon, Film, FileText, 
  Tag, Plus, Cloud, CheckCircle2, Trash2, BrainCircuit,
  Briefcase, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// --- MOCK DATA: ATIVOS COM CONTEXTO DE AGÊNCIA ---
const INITIAL_ASSETS = [
  { 
    id: 1, 
    name: "Campanha_Verao_Feed_01.jpg", 
    type: "image", 
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", 
    client: "Varejo S.A.", 
    campaign: "Saldão de Janeiro", 
    job: "Posts Feed Instagram",   
    size: "2.4 MB", 
    tags: ["produto", "relogio", "feed"] 
  },
  { 
    id: 2, 
    name: "Comercial_TV_30s_V2.mp4", 
    type: "video", 
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80", 
    client: "Moda Fashion", 
    campaign: "Coleção Outono/Inverno",
    job: "Filme Institucional",
    size: "145 MB", 
    tags: ["video", "tv", "landscape"] 
  },
  { 
    id: 3, 
    name: "Contrato_Influencers.pdf", 
    type: "pdf", 
    url: "", 
    client: "Burger King", 
    campaign: "Lançamento Whopper Jr",
    job: "Gestão de Influenciadores",
    size: "450 KB", 
    tags: ["legal", "contrato"] 
  },
  { 
    id: 4, 
    name: "Banner_Site_BlackFriday.png", 
    type: "image", 
    url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80", 
    client: "Tech Sol.", 
    campaign: "Black Friday 2026",
    job: "Assets Web",
    size: "1.1 MB", 
    tags: ["promo", "black friday"] 
  },
  { 
    id: 5, 
    name: "Shooting_Lookbook_05.jpg", 
    type: "image", 
    url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80", 
    client: "Moda Fashion", 
    campaign: "Coleção Outono/Inverno",
    job: "Lookbook Digital",
    size: "5.6 MB", 
    tags: ["fashion", "modelo"] 
  },
];

export default function Library() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [isUploading, setIsUploading] = useState(false);

  // --- SIMULAÇÃO: Upload Inteligente (Contextual + Visual) ---
  const handleSimulatedUpload = () => {
    setIsUploading(true);
    toast.info("Vinculando arquivo ao Job #892 (Nike Air)..."); // Simula a seleção do Job

    // Simula tempo de processamento da IA
    setTimeout(() => {
        toast.info("🤖 A IA está analisando o conteúdo visual...");
    }, 1500);

    setTimeout(() => {
        const newAsset = { 
            id: Date.now(), 
            name: "Nike_Air_Campaign_KV_Final.jpg", 
            type: "image", 
            url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", 
            client: "Nike Global", 
            campaign: "Lançamento Air Max", // <--- Contexto Automático
            job: "Key Visuals (KVs)",       // <--- Contexto Automático
            size: "3.2 MB", 
            tags: ["tenis", "esporte", "vermelho", "nike", "sneaker"] // Tags Visuais geradas
        };
        setAssets([newAsset, ...assets]);
        setIsUploading(false);
        toast.success("Upload concluído!", {
            description: "Ativo vinculado à campanha 'Lançamento Air Max' e etiquetado pela IA."
        });
    }, 3500);
  };

  // --- LÓGICA DE FILTROS ---
  const filteredAssets = assets.filter(asset => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = asset.name.toLowerCase().includes(searchLower) || 
                          asset.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
                          asset.campaign.toLowerCase().includes(searchLower) || // Busca por campanha
                          asset.client.toLowerCase().includes(searchLower);     // Busca por cliente
    const matchesType = filterType === 'all' || asset.type === filterType;
    return matchesSearch && matchesType;
  });

  // Helper para ícones
  const getIconByType = (type: string) => {
    switch(type) {
        case 'video': return <Film className="w-8 h-8 text-blue-500" />;
        case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
        case 'audio': return <Cloud className="w-8 h-8 text-yellow-500" />;
        default: return <ImageIcon className="w-8 h-8 text-pink-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-900/30 rounded-lg"><Cloud className="w-8 h-8 text-pink-500" /></div>
          <div>
              <h1 className="text-2xl font-bold">Biblioteca (DAM)</h1>
              <p className="text-zinc-500 text-sm">Gestão de Ativos & Inteligência Visual</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500" />
                <Input 
                    placeholder="Buscar por tag, job ou cliente..." 
                    className="pl-8 bg-zinc-900 border-zinc-800 focus:ring-pink-500 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}><Grid className="w-4 h-4"/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}><List className="w-4 h-4"/></button>
            </div>

            <Button onClick={handleSimulatedUpload} disabled={isUploading} className="bg-pink-600 hover:bg-pink-500 text-white font-bold gap-2 shadow-lg shadow-pink-900/20">
                {isUploading ? <BrainCircuit className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" />}
                {isUploading ? "IA Analisando..." : "Upload Inteligente"}
            </Button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden pt-6 gap-6">
        
        {/* SIDEBAR FILTROS */}
        <aside className="w-48 shrink-0 hidden md:block space-y-6">
            <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 px-2">Tipo de Arquivo</h3>
                <div className="space-y-1">
                    {['all', 'image', 'video', 'pdf', 'audio'].map(type => (
                        <button 
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${filterType === type ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                        >
                            <span className="capitalize">{type === 'all' ? 'Todos' : type}</span>
                            {filterType === type && <CheckCircle2 className="w-3 h-3 text-pink-500"/>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2 mb-2 text-pink-400">
                    <BrainCircuit className="w-4 h-4" />
                    <span className="text-xs font-bold">Auto-Tagging</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                    A IA cataloga o conteúdo visual (ex: "praia") e o sistema vincula automaticamente à Campanha do Atendimento.
                </p>
            </div>

            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <h4 className="text-xs font-bold text-white mb-2">Armazenamento</h4>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden mb-1">
                    <div className="bg-pink-600 w-[65%] h-full rounded-full"></div>
                </div>
                <p className="text-[10px] text-zinc-500 flex justify-between">
                    <span>650 GB usados</span>
                    <span>1 TB</span>
                </p>
            </div>
        </aside>

        {/* ÁREA PRINCIPAL (GRID/LIST) */}
        <main className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
            
            {filteredAssets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                    <Search className="w-16 h-16 mb-4 opacity-20" />
                    <p>Nenhum arquivo encontrado.</p>
                </div>
            ) : viewMode === 'grid' ? (
                // --- VISÃO EM GRID ---
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredAssets.map(asset => (
                        <div key={asset.id} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-pink-500/50 transition-all hover:shadow-2xl hover:shadow-pink-900/20 flex flex-col">
                            {/* Thumbnail */}
                            <div className="aspect-square bg-black relative flex items-center justify-center overflow-hidden">
                                {asset.type === 'image' || asset.type === 'video' ? (
                                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    getIconByType(asset.type)
                                )}
                                {/* Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button size="icon" variant="secondary" className="rounded-full w-8 h-8"><Download className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="secondary" className="rounded-full w-8 h-8"><Share2 className="w-4 h-4" /></Button>
                                </div>
                                <div className="absolute top-2 left-2">
                                    <Badge className="bg-black/50 backdrop-blur text-[10px] border-none text-white hover:bg-black/70">{asset.type.toUpperCase()}</Badge>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-medium text-white truncate pr-2 w-full" title={asset.name}>{asset.name}</h4>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger><MoreVertical className="w-4 h-4 text-zinc-500 hover:text-white shrink-0" /></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-500"><Trash2 className="w-3 h-3 mr-2"/> Excluir</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                
                                {/* CONTEXTO DO ATENDIMENTO */}
                                <div className="mb-3 space-y-0.5 border-t border-zinc-800/50 pt-2 mt-1">
                                    <p className="text-[10px] text-zinc-300 font-bold flex items-center gap-1">
                                        <Briefcase className="w-3 h-3 text-pink-500" /> {asset.client}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 truncate" title={`${asset.campaign} > ${asset.job}`}>
                                        {asset.campaign}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-1 mt-auto">
                                    {asset.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-md flex items-center border border-zinc-700">
                                            <Tag className="w-2 h-2 mr-1 opacity-50"/> {tag}
                                        </span>
                                    ))}
                                    {asset.tags.length > 3 && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md border border-zinc-700">+{asset.tags.length - 3}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // --- VISÃO EM LISTA ---
                <div className="space-y-2">
                    {filteredAssets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-lg hover:border-pink-500/30 transition group">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-zinc-800">
                                    {asset.type === 'image' ? <img src={asset.url} alt={asset.name} className="w-full h-full object-cover"/> : getIconByType(asset.type)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-medium text-white truncate">{asset.name}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                                        <Badge variant="outline" className="text-[10px] h-5 border-zinc-700 text-zinc-300 bg-zinc-800">{asset.client}</Badge>
                                        <span className="flex items-center gap-1 text-zinc-400"><FolderOpen className="w-3 h-3"/> {asset.campaign}</span>
                                        <span>• {asset.size}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex gap-1">
                                    {asset.tags.map(tag => <span key={tag} className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 border border-zinc-700">#{tag}</span>)}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="ghost" className="hover:bg-zinc-800"><Download className="w-4 h-4 text-zinc-400"/></Button>
                                    <Button size="sm" variant="ghost" className="hover:bg-zinc-800"><Share2 className="w-4 h-4 text-zinc-400"/></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
      </div>
    </div>
  );
}
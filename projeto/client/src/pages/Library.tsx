import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { 
  Grid, List, Search, Download, Upload,
  Image as ImageIcon, Film, Plus, Cloud, 
  RefreshCw, Eye, X, FolderOpen, ChevronRight, Trash2,
  FileIcon, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { supabase, supabaseUrl } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";

const getAuthHeaders = async (extra?: Record<string, string>) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function Library() {
  const { activeTenant } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);

 // --- 1. DOWNLOAD REAL DE ARQUIVOS ---
  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase
      .storage
      .from("library")
      .createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data?.signedUrl || "";
  };

  const isLocalhostUrl = (url: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);

  const resolveAssetUrl = async (rawUrl: string) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("text:")) return rawUrl;
    if (isLocalhostUrl(rawUrl)) return ""; // inacessível em produção
    if (rawUrl.startsWith("gdrive:")) {
      const id = rawUrl.replace("gdrive:", "");
      if (!id) return "";
      return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    if (rawUrl.startsWith("http")) return rawUrl;
    return await getSignedUrl(rawUrl);
  };

  const downloadAsset = async (url: string, fileName: string) => {
    try {
      if (url.startsWith("text:")) {
        const text = decodeURIComponent(url.replace("text:", ""));
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download iniciado!");
        return;
      }
      const resolvedUrl = await resolveAssetUrl(url);
      if (!resolvedUrl) throw new Error("URL inválida.");
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download iniciado!");
    } catch (err) {
      toast.error("Erro ao baixar arquivo.");
    }
  };

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  // Upload direto ao Supabase Storage via XHR com progresso real
  const uploadVideoWithProgress = (
    storagePath: string,
    file: File,
    token: string,
    onProgress: (pct: number) => void
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/library/${storagePath}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Falha no upload (${xhr.status}): ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error("Erro de rede durante o upload."));
      xhr.onabort = () => reject(new Error("Upload cancelado."));
      xhr.send(file);
    });

  const handleOpenAddLink = () => {
    if (!activeTenant || activeTenant === "all") {
      toast.error("Selecione um cliente antes de adicionar links.");
      return;
    }
    setLinkUrl("");
    setLinkTitle("");
    setIsAddingLink(true);
  };

  const handleAddLink = async () => {
    const raw = linkUrl.trim();
    if (!raw) {
      toast.error("Informe a URL do conteúdo.");
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      toast.error("A URL precisa começar com http:// ou https://");
      return;
    }

    const name = linkTitle.trim();
    const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(raw) || raw.includes("youtube.com") || raw.includes("youtu.be");
    const type = isVideo ? "video" : "image";

    try {
      const { error } = await supabase
        .from("library")
        .insert({
          tenant_slug: activeTenant,
          url: raw,
          type,
          title: name || null,
          provider: "external",
        });

      if (error) throw error;
      toast.success("Link adicionado à Biblioteca!");
      setIsAddingLink(false);
      await fetchLibrary();
    } catch (err: any) {
      console.error("library link insert error:", err);
      toast.error(err?.message || "Erro ao adicionar link.");
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeTenant || activeTenant === "all") {
      toast.error("Selecione um cliente antes de enviar.");
      e.target.value = "";
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Formato não suportado. Envie imagem ou vídeo.");
      e.target.value = "";
      return;
    }

    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "png")).toLowerCase();
    const safeName = file.name
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "asset";
    const storagePath = `${activeTenant}/${Date.now()}-${safeName}.${ext}`;

    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(0);

    try {
      if (isVideo) {
        // Vídeos: upload direto ao Supabase Storage via XHR com progresso
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");

        await uploadVideoWithProgress(storagePath, file, token, setUploadProgress);

        // Registra na tabela library
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/library/${storagePath}`;
        const { error: dbErr } = await supabase.from("library").insert({
          tenant_slug: activeTenant,
          url: publicUrl,
          type: "video",
          title: file.name,
          provider: "supabase",
        });
        if (dbErr) throw dbErr;
        toast.success("Vídeo enviado para a Biblioteca!");
      } else {
        // Imagens: via backend (permite processamento/resize)
        const form = new FormData();
        form.append("tenant_slug", activeTenant);
        form.append("file", file);
        const res = await fetch(`${API_BASE}/library/upload`, {
          method: "POST",
          headers: await getAuthHeaders(),
          body: form,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || "Erro ao enviar imagem.");
        }
        setUploadProgress(100);
        toast.success("Imagem enviada para a Biblioteca!");
      }

      await fetchLibrary();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadFileName("");
      e.target.value = "";
    }
  };

  // --- 2. BUSCA E REALTIME ---
  const fetchLibrary = async () => {
    setIsLoadingDB(true);
    // Usamos a tabela 'library' do Supabase que você configurou no fluxo de Aprovação
    const { data, error } = await supabase
      .from('library')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("library fetch error:", error);
      toast.error(error.message || "Erro ao sincronizar biblioteca.");
      setIsLoadingDB(false);
      return;
    }

    const formatted = await Promise.all(
      data.map(async (item) => {
        const resolvedUrl = await resolveAssetUrl(item.url);
        const unavailable = !resolvedUrl && !item.url?.startsWith("text:");
        return {
          id: item.id,
          name: item.title || (item.type === "text" ? `Texto_${item.id}` : `Asset_${item.id}`),
          type: item.type,
          url: resolvedUrl,
          raw_url: item.url,
          unavailable,
          client: item.tenant_slug.toUpperCase(),
          campaign: "Geral",
          size: "Varia",
          date: new Date(item.created_at).toLocaleDateString('pt-BR')
        };
      })
    );

    setAssets(formatted);
    setIsLoadingDB(false);
  };

  useEffect(() => {
    fetchLibrary();

    // ESCUTA REALTIME: Se algo for aprovado e salvo, a biblioteca atualiza na hora
    const channel = supabase.channel('library-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'library' }, 
      () => { 
        fetchLibrary();
        toast.info("Novo ativo adicionado à biblioteca! ✨");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTenant]);

  useEffect(() => {
    if (activeTenant && activeTenant !== "all") {
      setSelectedFolder(activeTenant.toUpperCase());
    }
  }, [activeTenant]);

  // 3. GERAÇÃO DINÂMICA DE PASTAS BASEADA NOS CLIENTES EXISTENTES
  const dynamicFolders = useMemo(() => {
    const clients = assets.map(a => a.client);
    const uniqueClients = Array.from(new Set(clients)).filter(Boolean);
    return ['Todos', ...uniqueClients];
  }, [assets]);

  const handleDeleteAsset = async (id: string | number, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!confirm("Excluir este arquivo permanentemente da nuvem?")) return;
      
      try {
          const res = await fetch(`${API_BASE}/library/${id}`, {
            method: "DELETE",
            headers: await getAuthHeaders(),
          });
          if (!res.ok) throw new Error();
          toast.success("Arquivo removido.");
          if (viewingAsset?.id === id) setViewingAsset(null);
          setAssets(prev => prev.filter(asset => asset.id !== id));
      } catch (err) {
          toast.error("Erro ao excluir arquivo.");
      }
  };

  const filteredAssets = assets.filter(asset => {
    if (selectedFolder !== 'Todos' && asset.client !== selectedFolder) return false;
    const searchLower = searchQuery.toLowerCase();
    return asset.name.toLowerCase().includes(searchLower) || 
           asset.client.toLowerCase().includes(searchLower);
  });

  return (
    <div className="bg-black text-zinc-100 p-6 flex flex-col h-full relative font-sans overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black text-zinc-100">Biblioteca</h1>
          <p className="text-[11px] text-zinc-500">Arquivos do cliente selecionado</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddLink}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold"
          >
            <Plus className="w-3 h-3 mr-2" />
            Adicionar Link
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold min-w-[130px]"
            >
              {isUploading ? (
                <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Enviando {uploadProgress !== null ? `${uploadProgress}%` : "..."}</>
              ) : (
                <><Upload className="w-3 h-3 mr-2" /> Enviar Arquivo</>
              )}
            </Button>

            {/* Barra de progresso — aparece só durante upload de vídeo */}
            {isUploading && uploadProgress !== null && (
              <div className="w-[130px] space-y-0.5">
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-200 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadFileName && (
                  <p className="text-[9px] text-zinc-500 truncate max-w-[130px]">{uploadFileName}</p>
                )}
              </div>
            )}
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUploadFile}
          />
        </div>
      </div>
      

      {/* ÁREA DE CONTEÚDO */}
      {filteredAssets.length === 0 && !isLoadingDB ? (
        <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/5 p-20">
            <div className="p-6 bg-zinc-900 rounded-full mb-6">
                <FolderOpen className="w-12 h-12 opacity-20" />
            </div>
            <p className="text-lg font-bold text-white">Sua Nuvem está vazia</p>
            <p className="text-sm text-zinc-600 mt-2 mb-8 text-center max-w-xs">
              Aprove conteúdos no portal para que eles apareçam automaticamente aqui.
            </p>
            <div className="text-xs text-zinc-600 font-medium">
              Nenhum item encontrado para o cliente selecionado.
            </div>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAssets.map((asset) => {
                const isText = asset.type === "text" || (asset.url || "").startsWith("text:");
                const isVideo = asset.type === "video" || /\.(mp4|mov|webm|m4v)$/i.test(asset.url || "");
                return (
                <div
                  key={asset.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition cursor-pointer"
                  onClick={() => setViewingAsset(asset)}
                >
                  <div className="aspect-video bg-black/80 flex items-center justify-center p-2">
                    {asset.unavailable ? (
                      <div className="w-full h-full bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center justify-center text-center p-3">
                        <Film className="w-6 h-6 text-zinc-600 mb-2" />
                        <p className="text-[10px] text-zinc-500 font-medium">Mídia indisponível</p>
                        <p className="text-[9px] text-zinc-600 mt-1">Gerada localmente</p>
                      </div>
                    ) : isText ? (
                      <div className="w-full h-full bg-zinc-900 border border-zinc-800 rounded flex flex-col items-center justify-center text-center p-3">
                        <FileIcon className="w-6 h-6 text-zinc-400 mb-2" />
                        <p className="text-[10px] text-zinc-400">Texto da Redação</p>
                      </div>
                    ) : isVideo ? (
                      <video src={asset.url} className="w-full h-full object-contain" muted controls preload="metadata" />
                    ) : (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-100 truncate">{asset.name}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">{asset.client}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => { e.stopPropagation(); downloadAsset(asset.raw_url || asset.url, asset.name); }}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-[10px]"
                      >
                        <Download className="w-3 h-3 mr-2" /> Baixar
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                        variant="outline"
                        size="sm"
                        className="border-red-800 text-red-300 hover:bg-red-900/30 text-[10px]"
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Excluir
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map((asset) => {
                const isText = asset.type === "text" || (asset.url || "").startsWith("text:");
                const isVideo = asset.type === "video" || /\.(mp4|mov|webm|m4v)$/i.test(asset.url || "");
                return (
                <div
                  key={asset.id}
                  className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 hover:border-zinc-600 transition cursor-pointer"
                  onClick={() => setViewingAsset(asset)}
                >
                  <div className="w-20 h-12 bg-black/80 rounded overflow-hidden flex items-center justify-center p-1">
                    {isText ? (
                      <div className="w-full h-full bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center">
                        <FileIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                    ) : isVideo ? (
                      <video src={asset.url} className="w-full h-full object-contain" muted />
                    ) : (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">{asset.name}</p>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">{asset.client}</p>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">{asset.type}</div>
                  <div className="flex items-center gap-2">
                    <Button
                    onClick={(e) => { e.stopPropagation(); downloadAsset(asset.raw_url || asset.url, asset.name); }}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-[10px]"
                    >
                      <Download className="w-3 h-3 mr-2" /> Baixar
                    </Button>
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                      variant="outline"
                      size="sm"
                      className="border-red-800 text-red-300 hover:bg-red-900/30 text-[10px]"
                    >
                      <Trash2 className="w-3 h-3 mr-2" /> Excluir
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* LIGHTBOX (Botão de Download real aqui também) */}
      {viewingAsset && (
          <div className="fixed inset-0 z-50 bg-black/98 flex flex-col animate-in fade-in">
              {/* ... (cabeçalho do viewer) ... */}
              <Button 
                onClick={() => downloadAsset(viewingAsset.raw_url || viewingAsset.url, viewingAsset.name)}
                variant="outline" size="sm" className="..."
              >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download Original
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); handleDeleteAsset(viewingAsset.id); }}
                variant="outline"
                size="sm"
                className="border-red-800 text-red-300 hover:bg-red-900/30"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
              </Button>
              {/* ... (resto do viewer) ... */}
          </div>
      )}

      {isAddingLink && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Adicionar Link Externo</h2>
              <button
                onClick={() => setIsAddingLink(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold">URL do arquivo</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com/arquivo.mp4"
                  className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold">Título (opcional)</label>
                <Input
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Nome do conteúdo"
                  className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="text-[11px] text-zinc-500">
                O link ficará disponível para o tenant selecionado.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                onClick={() => setIsAddingLink(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                onClick={handleAddLink}
              >
                Salvar Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { 
  Users, Plus, Edit3, Trash2, Save, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase, supabaseAnonKey, supabaseUrl } from "../lib/supabase";

const ACCESS_ROLES = ["admin", "atendimento", "planejamento", "redator", "da", "midia", "cliente"];
const ACCESS_MODULES = [
  "dashboard",
  "atendimento",
  "planning",
  "social_media",
  "copy",
  "image_studio",
  "video_studio",
  "production",
  "media",
  "media_offline",
  "library",
  "approvals",
  "cadastro",
  "suppliers",
];

export default function Cadastro() {
  const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";
  const { user, tenantAccess } = useAuth();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [accessRows, setAccessRows] = useState<any[]>([]);
  const [isAccessEditing, setIsAccessEditing] = useState(false);
  const [accessForm, setAccessForm] = useState({
    id: "",
    user_id: "",
    tenant_slug: "",
    role: "admin",
    allowed_modules: [] as string[],
  });

  const [isTenantEditing, setIsTenantEditing] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    slug: "",
    name: "",
    allowed_modules: ACCESS_MODULES,
  });
  const [tenantUsers, setTenantUsers] = useState<{ user_id: string; role: string; allowed_modules: string[] }[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [contextTenant, setContextTenant] = useState("");
  const [contextFiles, setContextFiles] = useState<any[]>([]);
  const [contextSelectedPath, setContextSelectedPath] = useState("");
  const [contextContent, setContextContent] = useState("");
  const [contextIsBinary, setContextIsBinary] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextNewPath, setContextNewPath] = useState("");
  const [contextUploadFile, setContextUploadFile] = useState<File | null>(null);
  const [contextUploadFiles, setContextUploadFiles] = useState<File[]>([]);
  const [contextBatchUploading, setContextBatchUploading] = useState(false);
  const [contextBatchProgress, setContextBatchProgress] = useState<{
    name: string;
    path: string;
    status: "pending" | "uploading" | "success" | "error";
    message?: string;
  }[]>([]);
  const [apiTenant, setApiTenant] = useState("");
  const [apiProvider, setApiProvider] = useState("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiProviders, setApiProviders] = useState<{ provider: string; updated_at?: string }[]>([]);
  const [storageTenant, setStorageTenant] = useState("");
  const [storageProvider, setStorageProvider] = useState("gdrive");
  const [storageLoading, setStorageLoading] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);

  const internalAdmins = new Set([
    "36026e4f-d53c-422a-ae79-313f25eda530", // Danilo
    "48e96bd4-03b5-488e-91fb-c4e4a27d1d81", // Julia
    "a9c2011e-9d12-4289-9d27-9bf9d5096333", // Kleber
  ]);

  const getAuthHeaders = async () => {
    const getCachedToken = () => {
      try {
        const keys = Object.keys(localStorage).filter(
          (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
        );
        if (!keys.length) return null;
        const raw = localStorage.getItem(keys[0] || "");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.access_token || parsed?.currentSession?.access_token || null;
      } catch {
        return null;
      }
    };

    let token: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      token = data?.session?.access_token || null;
    } catch {
      token = null;
    }
    if (!token) token = getCachedToken();
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseAnonKey;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (apikey) headers.apikey = apikey;
    return headers;
  };

  const invokeAdminFn = async (fnName: string, body: any) => {
    const doFetch = async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      return { res, data };
    };

    let { res, data } = await doFetch();
    if (res.status === 401) {
      try {
        await supabase.auth.refreshSession();
      } catch {}
      ({ res, data } = await doFetch());
    }

    if (!res.ok) {
      return { data: null, error: { message: data?.error || data?.message || `HTTP ${res.status}` } };
    }
    return { data, error: null };
  };

  useEffect(() => {
      loadAccess();
  }, []);

  const loadAccess = async () => {
      try {
          const [profilesRes, tenantsRes, accessRes] = await Promise.all([
            supabase.from("profiles").select("id,name,email").order("name", { ascending: true }),
            supabase.from("tenants").select("*").order("name", { ascending: true }),
            supabase.from("user_tenants").select("id,user_id,tenant_slug,role,allowed_modules"),
          ]);
          if (profilesRes.error) throw profilesRes.error;
          if (tenantsRes.error) throw tenantsRes.error;
          if (accessRes.error) throw accessRes.error;
          setProfiles(profilesRes.data || []);
          let tenantList = tenantsRes.data || [];
          if (user?.id && !internalAdmins.has(user.id)) {
            tenantList = tenantList.filter(t => t.slug !== "mugo-ag");
          }
          setTenants(tenantList);
          setAccessRows(accessRes.data || []);
      } catch (e: any) {
          toast.error(e?.message || "Erro ao carregar acessos.");
      }
  };

  const loadTenantContext = async (tenantSlug: string) => {
    if (!tenantSlug) return;
    setContextLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenant_context")
        .select("id, tenant_slug, source_path, content, is_binary, content_type, size_bytes")
        .eq("tenant_slug", tenantSlug)
        .order("source_path", { ascending: true });
      if (error) throw error;
      setContextFiles(data || []);
      setContextSelectedPath("");
      setContextContent("");
      setContextIsBinary(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar contexto.");
    } finally {
      setContextLoading(false);
    }
  };

  const handleSelectContextFile = (row: any) => {
    setContextSelectedPath(row.source_path || "");
    setContextIsBinary(Boolean(row.is_binary));
    setContextContent(String(row.content || ""));
  };

  const handleSaveContextFile = async () => {
    if (!contextTenant) return toast.error("Selecione um tenant.");
    const path = (contextSelectedPath || contextNewPath).trim();
    if (!path) return toast.error("Informe o caminho do arquivo.");
    if (contextIsBinary) return toast.error("Arquivo binário não pode ser editado aqui. Use upload.");

    try {
      const { data, error } = await invokeAdminFn("tenant-context-admin", {
        action: "write",
        tenant_slug: contextTenant,
        source_path: path,
        content: contextContent,
      });
      if (error) throw error;
      toast.success("Contexto salvo.");
      setContextNewPath("");
      loadTenantContext(contextTenant);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar contexto.");
    }
  };

  const handleUploadContextFile = async () => {
    if (!contextTenant) return toast.error("Selecione um tenant.");
    const path = (contextSelectedPath || contextNewPath).trim();
    if (!path) return toast.error("Informe o caminho do arquivo.");
    if (!contextUploadFile) return toast.error("Selecione um arquivo.");

    try {
      const arrayBuffer = await contextUploadFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const contentBase64 = btoa(binary);

      const { error } = await invokeAdminFn("tenant-context-admin", {
        action: "upload",
        tenant_slug: contextTenant,
        source_path: path,
        content_base64: contentBase64,
        content_type: contextUploadFile.type || undefined,
      });
      if (error) throw error;
      toast.success("Arquivo enviado.");
      setContextUploadFile(null);
      loadTenantContext(contextTenant);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar arquivo.");
    }
  };

  const deriveContextSourcePath = (file: File, tenantSlug: string) => {
    let path = (file as any)?.webkitRelativePath || file.name || "";
    path = String(path).replace(/\\/g, "/");
    const markers = [
      `/tenant_context/${tenantSlug}/`,
      `tenant_context/${tenantSlug}/`,
      `/${tenantSlug}/`,
      `${tenantSlug}/`,
    ];
    for (const m of markers) {
      const idx = path.indexOf(m);
      if (idx >= 0) {
        return path.slice(idx + m.length).replace(/^\/+/, "");
      }
    }
    return path.replace(/^\/+/, "");
  };

  const handleBatchUploadContext = async () => {
    if (!contextTenant) return toast.error("Selecione um tenant.");
    if (!contextUploadFiles.length) return toast.error("Selecione uma pasta com arquivos.");
    setContextBatchUploading(true);
    let ok = 0;
    let fail = 0;
    try {
      const progressInit = contextUploadFiles.map((file) => ({
        name: file.name,
        path: deriveContextSourcePath(file, contextTenant),
        status: "pending" as const,
      }));
      setContextBatchProgress(progressInit);

      for (const file of contextUploadFiles) {
        const path = deriveContextSourcePath(file, contextTenant);
        if (!path) {
          setContextBatchProgress((prev) =>
            prev.map((p) =>
              p.name === file.name && p.path === path
                ? { ...p, status: "error", message: "Caminho inválido" }
                : p
            )
          );
          fail += 1;
          continue;
        }
        setContextBatchProgress((prev) =>
          prev.map((p) =>
            p.name === file.name && p.path === path ? { ...p, status: "uploading" } : p
          )
        );
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const contentBase64 = btoa(binary);
        const { error } = await invokeAdminFn("tenant-context-admin", {
          action: "upload",
          tenant_slug: contextTenant,
          source_path: path,
          content_base64: contentBase64,
          content_type: file.type || undefined,
        });
        if (error) {
          setContextBatchProgress((prev) =>
            prev.map((p) =>
              p.name === file.name && p.path === path
                ? { ...p, status: "error", message: error.message || "Erro ao enviar" }
                : p
            )
          );
          fail += 1;
        } else {
          setContextBatchProgress((prev) =>
            prev.map((p) =>
              p.name === file.name && p.path === path ? { ...p, status: "success" } : p
            )
          );
          ok += 1;
        }
      }
      toast.success(`Upload em lote concluído: ${ok} ok, ${fail} falha(s).`);
      loadTenantContext(contextTenant);
      setContextUploadFiles([]);
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload em lote.");
    } finally {
      setContextBatchUploading(false);
    }
  };

  const handleImportContext = async () => {
    if (!contextTenant) return toast.error("Selecione um tenant.");
    try {
      const { data: validateData, error: validateError } = await invokeAdminFn("tenant-context-admin", {
        action: "validate",
        tenant_slug: contextTenant,
        from_slug: "_default",
      });
      if (validateError) throw validateError;
      const missing = Array.isArray((validateData as any)?.missing) ? (validateData as any).missing : [];
      const extra = Array.isArray((validateData as any)?.extra) ? (validateData as any).extra : [];
      if (missing.length > 0) {
        const proceed = confirm(`Faltam ${missing.length} arquivo(s) em relação ao _default. Deseja importar mesmo assim?`);
        if (!proceed) return;
      }

      const { data, error } = await invokeAdminFn("tenant-context-admin", {
        action: "sync",
        tenant_slug: contextTenant,
        from_slug: "_default",
        force: missing.length > 0,
      });
      if (error) throw error;
      toast.success(`Importado: ${(data as any)?.synced ?? 0} arquivos`);
      loadTenantContext(contextTenant);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar contexto.");
    }
  };

  const handleValidateContext = async () => {
    if (!contextTenant) return toast.error("Selecione um tenant.");
    try {
      const { data, error } = await invokeAdminFn("tenant-context-admin", {
        action: "validate",
        tenant_slug: contextTenant,
        from_slug: "_default",
      });
      if (error) throw error;
      const missing = Array.isArray((data as any)?.missing) ? (data as any).missing.length : 0;
      const extra = Array.isArray((data as any)?.extra) ? (data as any).extra.length : 0;
      toast.success(`Validação ok. Faltando: ${missing}, extras: ${extra}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao validar contexto.");
    }
  };

  const handleDuplicateContextFromDefault = async () => {
    const slug = tenantForm.slug.trim();
    if (!slug) return toast.error("Informe o slug do tenant.");
    try {
      const { data, error } = await invokeAdminFn("tenant-context-admin", {
        action: "duplicate",
        tenant_slug: slug,
        from_slug: "_default",
      });
      if (error) throw error;
      toast.success(`Duplicado: ${(data as any)?.files ?? 0} arquivos`);
      setContextTenant(slug);
      loadTenantContext(slug);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao duplicar contexto.");
    }
  };

  const loadTenantApiKeys = async (tenantSlug: string) => {
    if (!tenantSlug) return;
    try {
      const { data, error } = await invokeAdminFn("tenant-keys-admin", {
        action: "list",
        tenant_slug: tenantSlug,
      });
      if (error) throw error;
      setApiProviders((data as any)?.providers || []);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar chaves.");
    }
  };

  const handleSaveTenantApiKey = async () => {
    if (!apiTenant) return toast.error("Selecione um tenant.");
    if (!apiKeyInput.trim()) return toast.error("Informe a API key.");
    try {
      const { error } = await invokeAdminFn("tenant-keys-admin", {
        action: "upsert",
        tenant_slug: apiTenant,
        provider: apiProvider,
        api_key: apiKeyInput.trim(),
      });
      if (error) throw error;
      toast.success("Chave salva.");
      setApiKeyInput("");
      loadTenantApiKeys(apiTenant);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar chave.");
    }
  };

  const handleDeleteTenantApiKey = async (provider: string) => {
    if (!apiTenant) return toast.error("Selecione um tenant.");
    if (!confirm(`Remover chave de ${provider}?`)) return;
    try {
      const { error } = await invokeAdminFn("tenant-keys-admin", {
        action: "delete",
        tenant_slug: apiTenant,
        provider,
      });
      if (error) throw error;
      toast.success("Chave removida.");
      loadTenantApiKeys(apiTenant);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover chave.");
    }
  };

  const loadTenantStorageConfig = async (tenantSlug: string) => {
    if (!tenantSlug) return;
    const { data, error } = await supabase
      .from("tenant_storage_config")
      .select("provider")
      .eq("tenant_slug", tenantSlug)
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") return;
    if (data?.provider) setStorageProvider(data.provider);
  };

  const loadTenantDriveStatus = async (tenantSlug: string) => {
    if (!tenantSlug) return;
    const { data, error } = await supabase
      .from("tenant_drive_tokens")
      .select("tenant_slug, drive_folder_id, expires_at")
      .eq("tenant_slug", tenantSlug)
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") return;
    if (data?.tenant_slug) {
      setDriveConnected(true);
      setDriveFolderId(data.drive_folder_id || null);
      return;
    }
    setDriveConnected(false);
    setDriveFolderId(null);
  };

  const saveTenantStorageConfig = async () => {
    if (!storageTenant) return toast.error("Selecione um tenant.");
    setStorageLoading(true);
    try {
      const { error } = await supabase
        .from("tenant_storage_config")
        .upsert({ tenant_slug: storageTenant, provider: storageProvider }, { onConflict: "tenant_slug" });
      if (error) throw error;
      toast.success("Configuração de storage salva.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar storage.");
    } finally {
      setStorageLoading(false);
    }
  };

  const connectGoogleDrive = async () => {
    if (!storageTenant) return toast.error("Selecione um tenant.");
    try {
      const res = await fetch(`${API_BASE}/drive/oauth/start?tenant_slug=${storageTenant}`);
      if (!res.ok) throw new Error("Erro ao iniciar OAuth.");
      const data = await res.json();
      if (!data?.auth_url) throw new Error("URL inválida.");
      window.open(data.auth_url, "_blank", "noopener,noreferrer");
      toast.info("Após autorizar, volte aqui e atualize o status.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao abrir OAuth.");
    }
  };

  const refreshDriveStatus = async () => {
    if (!storageTenant) return toast.error("Selecione um tenant.");
    await loadTenantDriveStatus(storageTenant);
    toast.success("Status atualizado.");
  };


  const resetAccessForm = () => {
    setAccessForm({
      id: "",
      user_id: "",
      tenant_slug: "",
      role: "admin",
      allowed_modules: [],
    });
  };

  const handleAccessSave = async () => {
      if (!accessForm.user_id || !accessForm.tenant_slug) {
          toast.warning("Selecione usuário e tenant.");
          return;
      }
      try {
          const payload = {
            user_id: accessForm.user_id,
            tenant_slug: accessForm.tenant_slug,
            role: accessForm.role,
            allowed_modules: accessForm.allowed_modules,
          };
          if (accessForm.id) {
            const { error } = await supabase.from("user_tenants").update(payload).eq("id", accessForm.id);
            if (error) throw error;
            toast.success("Acesso atualizado.");
          } else {
            const { error } = await supabase.from("user_tenants").insert([payload]);
            if (error) throw error;
            toast.success("Acesso criado.");
          }
          setIsAccessEditing(false);
          resetAccessForm();
          loadAccess();
      } catch (e: any) {
          toast.error(e?.message || "Erro ao salvar acesso.");
      }
  };

  const handleAccessDelete = async (id: number) => {
      if (!confirm("Remover este acesso?")) return;
      try {
          const { error } = await supabase.from("user_tenants").delete().eq("id", id);
          if (error) throw error;
          toast.success("Acesso removido.");
          setAccessRows(prev => prev.filter(a => a.id !== id));
      } catch (e: any) {
          toast.error(e?.message || "Erro ao excluir acesso.");
      }
  };

  const handleAccessEdit = (row: any) => {
      setAccessForm({
        id: row.id,
        user_id: row.user_id,
        tenant_slug: row.tenant_slug,
        role: row.role || "admin",
        allowed_modules: Array.isArray(row.allowed_modules) ? row.allowed_modules : [],
      });
      setIsAccessEditing(true);
  };

  const resetTenantForm = () => {
    setTenantForm({ slug: "", name: "", allowed_modules: ACCESS_MODULES });
    setTenantUsers([]);
    setUserEmail("");
  };

  const addUserByEmail = async () => {
    const email = userEmail.trim().toLowerCase();
    if (!email) return;

    // Primeiro tenta encontrar no state já carregado
    let profile = profiles.find(p => p.email?.toLowerCase() === email);

    // Se não encontrar, busca direto no Supabase
    if (!profile) {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email")
        .ilike("email", email)
        .single();
      profile = data ?? undefined;
    }

    if (!profile) {
      toast.error("Usuário não encontrado. Peça para ele criar uma conta primeiro.");
      return;
    }
    if (tenantUsers.find(u => u.user_id === profile!.id)) {
      toast.warning("Usuário já adicionado.");
      return;
    }
    setTenantUsers(prev => [...prev, { user_id: profile!.id, role: "cliente", allowed_modules: [] }]);
    setUserEmail("");
  };

  const handleTenantSave = async () => {
    if (!tenantForm.slug.trim() || !tenantForm.name.trim()) {
      toast.warning("Slug e nome são obrigatórios.");
      return;
    }
    try {
      const slug = tenantForm.slug.trim();
      const payload = {
        slug,
        name: tenantForm.name.trim(),
        allowed_modules: tenantForm.allowed_modules,
      };
      const { error } = await supabase.from("tenants").upsert(payload, { onConflict: "slug" });
      if (error) throw error;

      if (tenantUsers.length > 0) {
        const accessPayloads = tenantUsers.map(u => ({
          user_id: u.user_id,
          tenant_slug: slug,
          role: u.role,
          allowed_modules: u.allowed_modules,
        }));
        const { error: accessError } = await supabase
          .from("user_tenants")
          .upsert(accessPayloads, { onConflict: "user_id,tenant_slug" });
        if (accessError) throw accessError;
      }

      toast.success("Tenant salvo.");
      setIsTenantEditing(false);
      resetTenantForm();
      loadAccess();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar tenant.");
    }
  };

  const handleTenantEdit = (row: any) => {
    setTenantForm({
      slug: row.slug || "",
      name: row.name || "",
      allowed_modules: Array.isArray(row.allowed_modules) ? row.allowed_modules : [],
    });
    const existing = accessRows
      .filter((a: any) => a.tenant_slug === row.slug)
      .map((a: any) => ({
        user_id: a.user_id,
        role: a.role || "cliente",
        allowed_modules: Array.isArray(a.allowed_modules) ? a.allowed_modules : [],
      }));
    setTenantUsers(existing);
    setIsTenantEditing(true);
  };

  const handleTenantDelete = async (slug: string) => {
    if (!confirm(`Excluir o cliente "${slug}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const { error } = await supabase.from("tenants").delete().eq("slug", slug);
      if (error) throw error;
      toast.success("Cliente excluído.");
      loadAccess();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir cliente.");
    }
  };

  const handleTenantToggleActive = async (slug: string, nextActive: boolean) => {
    try {
      const { error } = await supabase.from("tenants").update({ is_active: nextActive }).eq("slug", slug);
      if (error) throw error;
      toast.success(nextActive ? "Tenant reativado." : "Tenant desativado.");
      loadAccess();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar status do tenant.");
    }
  };

  const allowedAdmins = new Set([
    "36026e4f-d53c-422a-ae79-313f25eda530", // Danilo
    "48e96bd4-03b5-488e-91fb-c4e4a27d1d81", // Julia
    "a9c2011e-9d12-4289-9d27-9bf9d5096333", // Kleber
  ]);

  const isAllowedUser = user?.id ? allowedAdmins.has(user.id) : false;
  const hasMugoAccess =
    tenantAccess.some(t => t.tenantSlug === "mugo-ag") ||
    user?.allowedTenants?.includes("mugo-ag");

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-bold">Carregando...</h1>
        </div>
      </div>
    );
  }

  if (!isAllowedUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-bold">Acesso restrito</h1>
          <p className="text-sm text-zinc-400">
            A página de Cadastros é exclusiva da Mugô e apenas Danilo, Julia e Kleber podem acessar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8 font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Cadastros
                    </h1>
                    <p className="text-zinc-500 text-sm">Acessos e Tenants do sistema</p>
                </div>
            </div>
        </div>

        {/* ====== TENANTS ====== */}
        <div className="mt-14 border-t border-zinc-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Tenants</h2>
              <p className="text-xs text-zinc-500">Cadastre e edite clientes do sistema</p>
            </div>
            <Button onClick={() => { resetTenantForm(); setIsTenantEditing(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Tenant
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-3">
              {tenants.map((row: any) => (
                <div key={row.slug} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{row.name || row.slug}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{row.slug}</p>
                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded border ${
                      row.is_active === false
                        ? "text-red-300 border-red-900 bg-red-950/40"
                        : "text-emerald-300 border-emerald-900 bg-emerald-950/40"
                    }`}>
                      {row.is_active === false ? "inativo" : "ativo"}
                    </span>
                    {Array.isArray(row.allowed_modules) && row.allowed_modules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {row.allowed_modules.map((m: string) => (
                          <span key={m} className="text-[9px] uppercase text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-8 text-xs ${
                        row.is_active === false ? "text-emerald-400 hover:text-emerald-300" : "text-zinc-400 hover:text-white"
                      }`}
                      onClick={() => handleTenantToggleActive(row.slug, row.is_active === false)}
                    >
                      {row.is_active === false ? "Reativar" : "Desativar"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleTenantEdit(row)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => handleTenantDelete(row.slug)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
                  Nenhum tenant cadastrado.
                </div>
              )}
            </div>

            {isTenantEditing && (
              <div className="col-span-12 lg:col-span-4 animate-in slide-in-from-right-10">
                <Card className="bg-zinc-900 border-zinc-700 sticky top-6 shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-950/50 rounded-t-xl">
                    <CardTitle className="text-sm font-bold text-white">
                      {tenantForm.slug ? "Editar Tenant" : "Novo Tenant"}
                    </CardTitle>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => { setIsTenantEditing(false); resetTenantForm(); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome</label>
                      <Input
                        className="bg-black border-zinc-800 text-white"
                        value={tenantForm.name}
                        onChange={(e) => setTenantForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Mugô"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Slug</label>
                      <Input
                        className="bg-black border-zinc-800 text-white"
                        value={tenantForm.slug}
                        onChange={(e) => setTenantForm(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="ex: mugo-ag"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleDuplicateContextFromDefault}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                      >
                        Duplicar no Storage (_default)
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Módulos</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ACCESS_MODULES.map(m => (
                          <label key={m} className="flex items-center gap-2 text-[10px] text-zinc-300 bg-black border border-zinc-800 px-2 py-1.5 rounded">
                            <input
                              type="checkbox"
                              className="accent-emerald-500"
                              checked={tenantForm.allowed_modules.includes(m)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTenantForm(prev => ({
                                  ...prev,
                                  allowed_modules: checked
                                    ? [...prev.allowed_modules, m]
                                    : prev.allowed_modules.filter(x => x !== m),
                                }));
                              }}
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* USUÁRIOS COM ACESSO */}
                    <div className="space-y-2 border-t border-zinc-800 pt-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase block">Usuários com Acesso</label>

                      {tenantUsers.length === 0 && (
                        <p className="text-[10px] text-zinc-600 italic">Nenhum usuário adicionado.</p>
                      )}

                      {tenantUsers.map((u) => {
                        const profile = profiles.find(p => p.id === u.user_id);
                        return (
                          <div key={u.user_id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-white truncate max-w-37.5">
                                {profile?.name || profile?.email || u.user_id}
                              </span>
                              <button
                                onClick={() => setTenantUsers(prev => prev.filter(x => x.user_id !== u.user_id))}
                                className="text-zinc-600 hover:text-red-400 transition shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            <select
                              className="w-full bg-black border border-zinc-800 text-white text-[10px] rounded px-2 py-1 outline-none"
                              value={u.role}
                              onChange={(e) => setTenantUsers(prev =>
                                prev.map(x => x.user_id === u.user_id ? { ...x, role: e.target.value } : x)
                              )}
                            >
                              {ACCESS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <div className="grid grid-cols-2 gap-1">
                              {ACCESS_MODULES.map(m => (
                                <label key={m} className="flex items-center gap-1 text-[9px] text-zinc-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="accent-emerald-500"
                                    checked={u.allowed_modules.includes(m)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setTenantUsers(prev =>
                                        prev.map(x => x.user_id === u.user_id ? {
                                          ...x,
                                          allowed_modules: checked
                                            ? [...x.allowed_modules, m]
                                            : x.allowed_modules.filter(mod => mod !== m),
                                        } : x)
                                      );
                                    }}
                                  />
                                  {m}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Adicionar usuário por email */}
                      <div className="flex gap-2 pt-1">
                        <Input
                          className="bg-black border-zinc-800 text-white text-xs flex-1"
                          placeholder="email@usuario.com"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addUserByEmail()}
                        />
                        <Button
                          size="icon"
                          className="h-9 w-9 bg-zinc-800 hover:bg-zinc-700 shrink-0"
                          onClick={addUserByEmail}
                          title="Adicionar usuário"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <Button onClick={handleTenantSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
                      <Save className="w-4 h-4" /> Salvar Tenant
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* ====== GESTÃO DE ACESSOS ====== */}
        <div className="mt-14 border-t border-zinc-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Acessos por Cliente</h2>
              <p className="text-xs text-zinc-500">Gerencie roles e módulos por tenant</p>
            </div>
            <Button onClick={() => { resetAccessForm(); setIsAccessEditing(true); }} className="bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Acesso
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-8 space-y-3">
              {accessRows.map((row) => {
                const userLabel = profiles.find(p => p.id === row.user_id)?.name
                  || profiles.find(p => p.id === row.user_id)?.email
                  || row.user_id;
                const tenantLabel = tenants.find(t => t.slug === row.tenant_slug)?.name || row.tenant_slug;
                return (
                  <div key={row.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{userLabel}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        {tenantLabel} • {row.role}
                      </p>
                      {Array.isArray(row.allowed_modules) && row.allowed_modules.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {row.allowed_modules.map((m: string) => (
                            <span key={m} className="text-[9px] uppercase text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleAccessEdit(row)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => handleAccessDelete(row.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {accessRows.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
                  Nenhum acesso cadastrado.
                </div>
              )}
            </div>

            {isAccessEditing && (
              <div className="col-span-12 lg:col-span-4 animate-in slide-in-from-right-10">
                <Card className="bg-zinc-900 border-zinc-700 sticky top-6 shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-950/50 rounded-t-xl">
                    <CardTitle className="text-sm font-bold text-white">
                      {accessForm.id ? "Editar Acesso" : "Novo Acesso"}
                    </CardTitle>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => { setIsAccessEditing(false); resetAccessForm(); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Usuário</label>
                      <Select value={accessForm.user_id} onValueChange={(v) => setAccessForm(prev => ({ ...prev, user_id: v }))}>
                        <SelectTrigger className="bg-black border-zinc-800 text-white">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name || p.email || p.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Tenant</label>
                      <Select value={accessForm.tenant_slug} onValueChange={(v) => setAccessForm(prev => ({ ...prev, tenant_slug: v }))}>
                        <SelectTrigger className="bg-black border-zinc-800 text-white">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          {tenants.map(t => (
                            <SelectItem key={t.slug} value={t.slug}>{t.name || t.slug}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Role</label>
                      <Select value={accessForm.role} onValueChange={(v) => setAccessForm(prev => ({ ...prev, role: v }))}>
                        <SelectTrigger className="bg-black border-zinc-800 text-white">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          {ACCESS_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Módulos</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ACCESS_MODULES.map(m => (
                          <label key={m} className="flex items-center gap-2 text-[10px] text-zinc-300 bg-black border border-zinc-800 px-2 py-1.5 rounded">
                            <input
                              type="checkbox"
                              className="accent-purple-500"
                              checked={accessForm.allowed_modules.includes(m)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAccessForm(prev => ({
                                  ...prev,
                                  allowed_modules: checked
                                    ? [...prev.allowed_modules, m]
                                    : prev.allowed_modules.filter(x => x !== m),
                                }));
                              }}
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleAccessSave} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2">
                      <Save className="w-4 h-4" /> Salvar Acesso
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* ====== CONTEXTO DO TENANT ====== */}
        <div className="mt-14 border-t border-zinc-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Contexto do Tenant</h2>
              <p className="text-xs text-zinc-500">Edite os arquivos de contexto usados pelos agentes</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Tenant</label>
                <Select
                  value={contextTenant}
                  onValueChange={(v) => {
                    setContextTenant(v);
                    loadTenantContext(v);
                  }}
                >
                  <SelectTrigger className="bg-black border-zinc-800 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectItem value="_default">_default</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name || t.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Arquivos</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-[360px] overflow-y-auto">
                  {contextLoading && <p className="text-xs text-zinc-500 p-2">Carregando...</p>}
                  {!contextLoading && contextFiles.length === 0 && (
                    <p className="text-xs text-zinc-500 p-2">Nenhum arquivo encontrado.</p>
                  )}
                  {contextFiles.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => handleSelectContextFile(row)}
                      className={`w-full text-left text-[11px] px-2 py-1 rounded transition ${
                        contextSelectedPath === row.source_path ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {row.source_path}
                      {row.is_binary ? " (bin)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Arquivo Selecionado</label>
                <Input
                  className="bg-black border-zinc-800 text-white text-xs"
                  value={contextSelectedPath || contextNewPath}
                  onChange={(e) => {
                    if (contextSelectedPath) setContextSelectedPath(e.target.value);
                    else setContextNewPath(e.target.value);
                  }}
                  placeholder="ex: prompts/system.md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Conteúdo</label>
                <textarea
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 min-h-[320px] focus:outline-none focus:border-purple-500"
                  value={contextContent}
                  onChange={(e) => setContextContent(e.target.value)}
                  placeholder="Conteúdo do arquivo..."
                  disabled={contextIsBinary}
                />
                {contextIsBinary && (
                  <p className="text-xs text-zinc-500">Arquivo binário não pode ser editado aqui.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Upload (binário ou novo arquivo)</label>
                <Input
                  type="file"
                  className="bg-black border-zinc-800 text-white text-xs"
                  onChange={(e) => setContextUploadFile(e.target.files?.[0] || null)}
                />
                <p className="text-[10px] text-zinc-500">
                  Use para enviar arquivos binários ou criar novos arquivos diretamente no Storage.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Upload em lote (pasta)</label>
                <input
                  type="file"
                  multiple
                  // @ts-expect-error - atributo não padrão
                  webkitdirectory=""
                  // @ts-expect-error - atributo não padrão
                  directory=""
                  className="w-full bg-black border border-zinc-800 text-white text-xs rounded-md px-3 py-2"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setContextUploadFiles(files);
                    setContextBatchProgress([]);
                  }}
                />
                <p className="text-[10px] text-zinc-500">
                  Selecione a pasta do tenant no seu VSCode (ex.: tenant_context/roove).
                </p>
                {contextUploadFiles.length > 0 && (
                  <p className="text-[10px] text-zinc-400">
                    {contextUploadFiles.length} arquivo(s) selecionado(s).
                  </p>
                )}
              </div>

              {contextBatchProgress.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Progresso do Upload</label>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-[220px] overflow-y-auto">
                    {contextBatchProgress.map((p, idx) => {
                      const color =
                        p.status === "success"
                          ? "text-emerald-400"
                          : p.status === "error"
                          ? "text-red-400"
                          : p.status === "uploading"
                          ? "text-sky-400"
                          : "text-zinc-400";
                      const label =
                        p.status === "success"
                          ? "OK"
                          : p.status === "error"
                          ? "ERRO"
                          : p.status === "uploading"
                          ? "ENVIANDO"
                          : "PENDENTE";
                      return (
                        <div key={`${p.name}-${idx}`} className="flex items-center justify-between text-[10px] py-1">
                          <div className="text-zinc-300">
                            {p.path || p.name}
                          </div>
                          <div className={`font-bold ${color}`}>
                            {label}
                            {p.status === "error" && p.message ? `: ${p.message}` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setContextSelectedPath("");
                    setContextContent("");
                    setContextIsBinary(false);
                    setContextNewPath("");
                    setContextUploadFile(null);
                  }}
                  className="text-white font-bold hover:bg-zinc-800"
                >
                  Limpar
                </Button>
                <Button
                  onClick={handleUploadContextFile}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold"
                >
                  Enviar Arquivo
                </Button>
                <Button
                  onClick={handleBatchUploadContext}
                  disabled={contextBatchUploading}
                  className="bg-purple-700 hover:bg-purple-600 text-white font-bold"
                >
                  {contextBatchUploading ? "Enviando..." : "Enviar Pasta"}
                </Button>
                <Button
                  onClick={handleImportContext}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold"
                >
                  Importar do Storage
                </Button>
                <Button
                  onClick={handleValidateContext}
                  className="bg-sky-700 hover:bg-sky-600 text-white font-bold"
                >
                  Validar Estrutura
                </Button>
                <Button onClick={handleSaveContextFile} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Salvar Contexto
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ====== API KEYS POR TENANT ====== */}
        <div className="mt-14 border-t border-zinc-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">APIs por Tenant</h2>
              <p className="text-xs text-zinc-500">Cada cliente pode usar sua própria chave</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Tenant</label>
                <Select
                  value={apiTenant}
                  onValueChange={(v) => {
                    setApiTenant(v);
                    loadTenantApiKeys(v);
                  }}
                >
                  <SelectTrigger className="bg-black border-zinc-800 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    {tenants.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name || t.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Chaves cadastradas</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                  {apiProviders.length === 0 && (
                    <p className="text-xs text-zinc-500 p-2">Nenhuma chave cadastrada.</p>
                  )}
                  {apiProviders.map((p) => (
                    <div key={p.provider} className="flex items-center justify-between px-2 py-1 text-xs text-zinc-300">
                      <span>{p.provider}</span>
                      <button
                        onClick={() => handleDeleteTenantApiKey(p.provider)}
                        className="text-red-400 hover:text-red-300"
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Provider</label>
                  <Select value={apiProvider} onValueChange={(v) => setApiProvider(v)}>
                    <SelectTrigger className="bg-black border-zinc-800 text-white">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="openai">openai</SelectItem>
                      <SelectItem value="anthropic">anthropic</SelectItem>
                      <SelectItem value="google">google</SelectItem>
                      <SelectItem value="stability">stability</SelectItem>
                      <SelectItem value="replicate">replicate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">API Key</label>
                  <Input
                    className="bg-black border-zinc-800 text-white"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleSaveTenantApiKey}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Salvar Chave
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ====== STORAGE POR TENANT ====== */}
        <div className="mt-14 border-t border-zinc-800 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Storage por Tenant</h2>
              <p className="text-xs text-zinc-500">Google Drive é o padrão. R2/S3 opcional.</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Tenant</label>
                <Select
                  value={storageTenant}
                  onValueChange={(v) => {
                    setStorageTenant(v);
                    loadTenantStorageConfig(v);
                    loadTenantDriveStatus(v);
                  }}
                >
                  <SelectTrigger className="bg-black border-zinc-800 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    {tenants.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name || t.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Provider</label>
                  <Select value={storageProvider} onValueChange={(v) => setStorageProvider(v)}>
                    <SelectTrigger className="bg-black border-zinc-800 text-white">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="gdrive">Google Drive (padrão)</SelectItem>
                      <SelectItem value="r2">Cloudflare R2</SelectItem>
                      <SelectItem value="s3">AWS S3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Conectar Drive</label>
                  <Button
                    onClick={connectGoogleDrive}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Conectar Google Drive
                  </Button>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    {driveConnected ? (
                      <span className="text-emerald-400">Drive conectado</span>
                    ) : (
                      <span className="text-red-400">Drive não conectado</span>
                    )}
                    <button
                      onClick={refreshDriveStatus}
                      className="text-zinc-500 hover:text-white font-bold normal-case"
                    >
                      Atualizar
                    </button>
                    {driveFolderId && (
                      <span className="text-zinc-500 normal-case">({driveFolderId})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={saveTenantStorageConfig}
                  disabled={storageLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {storageLoading ? "Salvando..." : "Salvar Storage"}
                </Button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

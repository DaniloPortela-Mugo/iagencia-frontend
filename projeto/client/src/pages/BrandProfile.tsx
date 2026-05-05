import React, { useState, useEffect } from "react";
import { Save, RefreshCw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000";

type Profile = {
  tenant_slug: string;
  brand_name: string;
  segment: string;
  positioning: string;
  brand_promise: string;
  tone_of_voice: string;
  personality: string;
  core_values: string[];
  keywords_use: string[];
  keywords_avoid: string[];
  slogans: string[];
  target_audience: string;
  hashtags: string[];
  system_prompt: string;
  socialmedia_prompt: string;
};

const EMPTY: Omit<Profile, "tenant_slug"> = {
  brand_name: "", segment: "", positioning: "", brand_promise: "",
  tone_of_voice: "", personality: "", core_values: [], keywords_use: [],
  keywords_avoid: [], slogans: [], target_audience: "", hashtags: [],
  system_prompt: "", socialmedia_prompt: "",
};

async function getAuthHeaders(extra: Record<string, string> = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function TagInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-[11px] px-2 py-0.5 rounded-full">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-zinc-500 hover:text-red-400 ml-1">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          className="bg-black border-zinc-700 text-white h-8 text-xs flex-1"
          placeholder={`Adicionar ${label.toLowerCase()}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button onClick={add} className="h-8 px-3 text-xs bg-zinc-800 hover:bg-zinc-700">+</Button>
      </div>
    </div>
  );
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-zinc-800 pt-4">{children}</div>}
    </div>
  );
}

export default function BrandProfile() {
  const { activeTenant } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const tenantSlug = activeTenant && activeTenant !== "all" ? activeTenant : null;

  const load = async () => {
    if (!tenantSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/brand-profile/${tenantSlug}`, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      setProfile(await res.json());
    } catch {
      toast.error("Erro ao carregar perfil da marca.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenantSlug]);

  const set = (field: keyof Omit<Profile, "tenant_slug">, value: any) =>
    setProfile((p) => p ? { ...p, [field]: value } : p);

  const save = async () => {
    if (!tenantSlug || !profile) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/brand-profile/${tenantSlug}`, {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      toast.success("Perfil de marca salvo! A IA já usa o novo DNA.");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (!tenantSlug) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Selecione um cliente para editar o perfil de marca.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const p = profile ?? { ...EMPTY, tenant_slug: tenantSlug };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white uppercase tracking-widest">Perfil de Marca</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Tudo que você salvar aqui é injetado diretamente nas IAs ao gerar conteúdo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700" disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={save} disabled={saving} className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
          </Button>
        </div>
      </div>

      <Section title="Identidade da Marca">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Nome da Marca</label>
            <Input className="bg-black border-zinc-700 text-white h-9 text-xs" value={p.brand_name} onChange={(e) => set("brand_name", e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Segmento</label>
            <Input className="bg-black border-zinc-700 text-white h-9 text-xs" value={p.segment} onChange={(e) => set("segment", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Promessa de Marca</label>
          <Input className="bg-black border-zinc-700 text-white h-9 text-xs" value={p.brand_promise} onChange={(e) => set("brand_promise", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Posicionamento</label>
          <Textarea className="bg-black border-zinc-700 text-white text-xs min-h-16" value={p.positioning} onChange={(e) => set("positioning", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Público-Alvo</label>
          <Textarea className="bg-black border-zinc-700 text-white text-xs min-h-16" value={p.target_audience} onChange={(e) => set("target_audience", e.target.value)} />
        </div>
      </Section>

      <Section title="Tom de Voz e Personalidade">
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Tom de Voz</label>
          <Textarea className="bg-black border-zinc-700 text-white text-xs min-h-20" placeholder="Ex: Épico, ritualístico, motivador. Nunca genérico." value={p.tone_of_voice} onChange={(e) => set("tone_of_voice", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Personalidade / Arquétipo</label>
          <Input className="bg-black border-zinc-700 text-white h-9 text-xs" placeholder="Ex: O Herói Missionário" value={p.personality} onChange={(e) => set("personality", e.target.value)} />
        </div>
        <TagInput label="Valores Centrais" values={p.core_values} onChange={(v) => set("core_values", v)} />
        <TagInput label="Slogans Aprovados" values={p.slogans} onChange={(v) => set("slogans", v)} />
      </Section>

      <Section title="Vocabulário">
        <TagInput label="Palavras / Termos Obrigatórios" values={p.keywords_use} onChange={(v) => set("keywords_use", v)} />
        <TagInput label="Palavras / Termos Proibidos" values={p.keywords_avoid} onChange={(v) => set("keywords_avoid", v)} />
      </Section>

      <Section title="Social Media">
        <TagInput label="Hashtags" values={p.hashtags} onChange={(v) => set("hashtags", v)} />
      </Section>

      <Section title="Prompts Avançados" defaultOpen={false}>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">System Prompt (Persona da IA)</label>
          <Textarea className="bg-black border-zinc-700 text-white text-xs min-h-40 font-mono" value={p.system_prompt} onChange={(e) => set("system_prompt", e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Prompt Social Media</label>
          <Textarea className="bg-black border-zinc-700 text-white text-xs min-h-40 font-mono" value={p.socialmedia_prompt} onChange={(e) => set("socialmedia_prompt", e.target.value)} />
        </div>
      </Section>
    </div>
  );
}

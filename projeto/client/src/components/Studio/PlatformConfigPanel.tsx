import React, { useEffect, useState } from "react";
import { Image as ImageIcon, Film, Check, X, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { IMAGE_PLATFORMS, VIDEO_PLATFORMS, type PlatformDef } from "../../lib/platformConfig";

interface Props {
  tenantSlug: string;
}

interface PlatformRow {
  platform_id: string;
  is_enabled: boolean;
  extra_params: Record<string, any>;
}

export function PlatformConfigPanel({ tenantSlug }: Props) {
  const [rows, setRows] = useState<PlatformRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const allPlatforms = [...IMAGE_PLATFORMS, ...VIDEO_PLATFORMS];

  const load = async () => {
    if (!tenantSlug) return;
    setLoading(true);
    const { data } = await supabase
      .from("tenant_platform_configs")
      .select("platform_id, is_enabled, extra_params")
      .eq("tenant_slug", tenantSlug);

    if (data && data.length > 0) {
      setRows(data as PlatformRow[]);
    } else {
      // First time: show all platforms as enabled by default
      setRows(
        allPlatforms.map((p) => ({ platform_id: p.id, is_enabled: true, extra_params: {} }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantSlug]);

  const isEnabled = (platformId: string) =>
    rows.find((r) => r.platform_id === platformId)?.is_enabled ?? true;

  const toggle = async (platform: PlatformDef) => {
    const current = isEnabled(platform.id);
    const next = !current;
    setSaving(platform.id);
    const { error } = await supabase
      .from("tenant_platform_configs")
      .upsert(
        {
          tenant_slug: tenantSlug,
          platform_id: platform.id,
          platform_type: platform.type,
          is_enabled: next,
        },
        { onConflict: "tenant_slug,platform_id" }
      );
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } else {
      setRows((prev) => {
        const exists = prev.find((r) => r.platform_id === platform.id);
        if (exists) {
          return prev.map((r) =>
            r.platform_id === platform.id ? { ...r, is_enabled: next } : r
          );
        }
        return [...prev, { platform_id: platform.id, is_enabled: next, extra_params: {} }];
      });
      toast.success(`${platform.label} ${next ? "ativado" : "desativado"}.`);
    }
    setSaving(null);
  };

  const renderGroup = (platforms: PlatformDef[], title: string, Icon: React.ElementType) => (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      {platforms.map((p) => {
        const enabled = isEnabled(p.id);
        const isSaving = saving === p.id;
        return (
          <div
            key={p.id}
            className={`flex items-start justify-between gap-4 p-3 rounded-xl border transition-colors ${
              enabled
                ? "bg-zinc-900 border-zinc-700"
                : "bg-zinc-950 border-zinc-800 opacity-60"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">{p.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    p.promptStyle === "midjourney"
                      ? "bg-purple-900/50 text-purple-400"
                      : p.promptStyle === "json"
                      ? "bg-cyan-900/50 text-cyan-400"
                      : p.promptStyle === "tags"
                      ? "bg-amber-900/50 text-amber-400"
                      : p.promptStyle === "runwayml"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {p.promptStyle}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{p.description}</p>
              <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-600">
                {p.supportsNegativePrompt && <span className="text-green-600">✓ Negative</span>}
                {p.supportsReferences && <span className="text-blue-600">✓ Refs visuais</span>}
                <span>{p.language === "en" ? "🇺🇸 EN" : p.language === "pt" ? "🇧🇷 PT" : "🌎 EN/PT"}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => toggle(p)}
              className={`shrink-0 w-10 h-6 rounded-full border transition-all flex items-center justify-center ${
                enabled
                  ? "bg-green-600 border-green-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500"
              }`}
            >
              {isSaving ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : enabled ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  if (!tenantSlug) {
    return (
      <p className="text-[11px] text-zinc-600 text-center py-6">
        Selecione um cliente para configurar plataformas.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">Plataformas de IA</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Ative ou desative plataformas para o cliente <span className="text-zinc-300 font-bold">{tenantSlug}</span>.
            As páginas de Estúdio mostrarão apenas plataformas ativas.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-1"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderGroup(IMAGE_PLATFORMS, "Imagem", ImageIcon)}
          {renderGroup(VIDEO_PLATFORMS, "Vídeo", Film)}
        </div>
      )}

      <div className="pt-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Para adicionar chaves de API externas (Midjourney, Runway etc.), configure no painel do backend ou entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}

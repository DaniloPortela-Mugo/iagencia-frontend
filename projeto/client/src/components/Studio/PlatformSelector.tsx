import React, { useEffect, useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { IMAGE_PLATFORMS, VIDEO_PLATFORMS, type PlatformDef, type PlatformType } from "../../lib/platformConfig";
import { supabase } from "../../lib/supabase";

interface Props {
  type: PlatformType;
  value: string;
  onChange: (platformId: string) => void;
  tenantSlug: string;
}

export function PlatformSelector({ type, value, onChange, tenantSlug }: Props) {
  const allPlatforms = type === "image" ? IMAGE_PLATFORMS : VIDEO_PLATFORMS;
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!tenantSlug) {
      setEnabledIds(allPlatforms.map(p => p.id));
      return;
    }
    supabase
      .from("tenant_platform_configs")
      .select("platform_id, is_enabled")
      .eq("tenant_slug", tenantSlug)
      .eq("platform_type", type)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setEnabledIds(allPlatforms.map(p => p.id));
          return;
        }
        setEnabledIds(data.filter((r: any) => r.is_enabled).map((r: any) => r.platform_id));
      });
  }, [tenantSlug, type]);

  const visiblePlatforms = allPlatforms.filter(p => enabledIds.includes(p.id));
  const activePlatform = allPlatforms.find(p => p.id === value);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5 block">
          Plataforma de Geração
        </label>
        <select
          className="w-full bg-black border border-zinc-700 text-white h-9 text-xs rounded-md px-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {visiblePlatforms.map(p => (
            <option key={p.id} value={p.id} className="bg-zinc-900">
              {p.label}
            </option>
          ))}
        </select>
        {activePlatform && (
          <p className="text-[10px] text-zinc-600 mt-1">{activePlatform.description}</p>
        )}
      </div>

      {activePlatform && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 transition-colors"
            onClick={() => setShowGuide(v => !v)}
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3 h-3 text-blue-500" />
              Diretrizes: {activePlatform.label}
            </span>
            {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showGuide && (
            <div className="bg-zinc-950/80 px-3 py-3 space-y-1.5">
              {activePlatform.guidelines.map((g, i) => (
                <p key={i} className="text-[10px] text-zinc-400 leading-relaxed flex gap-1.5">
                  <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                  {g}
                </p>
              ))}
              {activePlatform.parameterHints && (
                <p className="text-[10px] text-zinc-600 mt-2 pt-2 border-t border-zinc-800 font-mono">
                  {activePlatform.parameterHints}
                </p>
              )}
              <div className="flex gap-3 mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-600">
                <span className={activePlatform.supportsNegativePrompt ? "text-green-500" : "text-zinc-700"}>
                  {activePlatform.supportsNegativePrompt ? "✓" : "✗"} Negative Prompt
                </span>
                <span className={activePlatform.supportsReferences ? "text-green-500" : "text-zinc-700"}>
                  {activePlatform.supportsReferences ? "✓" : "✗"} Referências visuais
                </span>
                <span className={activePlatform.supportsAspectRatio ? "text-green-500" : "text-zinc-700"}>
                  {activePlatform.supportsAspectRatio ? "✓" : "✗"} Aspect Ratio
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

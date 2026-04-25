import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type AppHeaderProps = {
  clientName: string;
  clientLogoSrc: string;
  onBack?: () => void;
};

export default function AppHeader({ clientName, clientLogoSrc, onBack }: AppHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    navigate(-1);
  };

  return (
    <header className="h-24 w-full border-b border-white/10 bg-black">
      <div className="h-full px-6 flex items-center">
        {/* ESQUERDA */}
        <div className="flex items-center gap-4 w-1/3">
          <button
            type="button"
            onClick={handleBack}
            className="h-12 w-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>

          <div className="flex items-center gap-3">
            {/* Logo IA (use seu componente/logo atual aqui) */}
            <div className="text-white font-bold text-3xl leading-none">
              iA
            </div>
          </div>
        </div>

        {/* CENTRO */}
        <div className="w-1/3 flex justify-center">
          <h1 className="text-white text-2xl font-medium tracking-tight">
            {clientName}
          </h1>
        </div>

        {/* DIREITA */}
        <div className="w-1/3 flex justify-end">
          <div className="h-12 w-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden">
            {clientLogoSrc ? (
              <img
                src={clientLogoSrc}
                alt={`Logo ${clientName}`}
                className="h-7 w-7 object-contain"
                draggable={false}
              />
            ) : (
              <span className="text-white text-xs font-bold">{clientName?.charAt(0) ?? "?"}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

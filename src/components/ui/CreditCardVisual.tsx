"use client";

import { formatCurrency } from "@/lib/format";

export type LayoutCartao = "GENERICO" | "NUBANK" | "ITAU";

type Props = {
  nome: string;
  limite: number;
  fechamento: number;
  vencimento: number;
  layout?: LayoutCartao;
  contexto?: string;
  className?: string;
};

const layouts = {
  NUBANK: {
    gradient: "from-violet-900 via-purple-900 to-violet-950",
    chip: "bg-amber-400/90",
    text: "text-white",
    subtext: "text-white/80",
    logo: "text-white font-bold text-lg tracking-tight",
  },
  ITAU: {
    gradient: "from-orange-600 via-red-600 to-orange-700",
    chip: "bg-amber-300/90",
    text: "text-white",
    subtext: "text-white/90",
    logo: "text-white font-bold text-lg tracking-wide",
  },
  GENERICO: {
    gradient: "from-slate-600 via-slate-700 to-slate-800",
    chip: "bg-amber-400/80",
    text: "text-white",
    subtext: "text-slate-200",
    logo: "text-white font-semibold text-base",
  },
};

export function CreditCardVisual({
  nome,
  limite,
  fechamento,
  vencimento,
  layout = "GENERICO",
  contexto,
  className = "",
}: Props) {
  const style = layouts[layout] ?? layouts.GENERICO;

  return (
    <div
      className={`aspect-[1.586] w-full max-w-[320px] overflow-hidden rounded-2xl bg-gradient-to-br shadow-xl ${style.gradient} ${className}`}
    >
      <div className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div className={`h-9 w-12 rounded-md ${style.chip}`} />
          {contexto && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.subtext} bg-white/20`}>
              {contexto}
            </span>
          )}
        </div>
        <div>
          <p className={`font-mono text-sm tracking-[0.2em] ${style.text}`}>
            •••• •••• •••• ••••
          </p>
          <p className={`mt-3 truncate font-medium ${style.logo}`}>{nome}</p>
          <div className={`mt-1 flex items-center gap-3 text-xs ${style.subtext}`}>
            <span>Fecha dia {fechamento}</span>
            <span>·</span>
            <span>Vence dia {vencimento}</span>
          </div>
          <p className={`mt-1 text-xs ${style.subtext}`}>Limite {formatCurrency(limite)}</p>
        </div>
      </div>
    </div>
  );
}

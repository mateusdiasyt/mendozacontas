type Status = "OK" | "ATENCAO" | "CRITICO";

const config: Record<Status, { label: string; className: string }> = {
  OK: { label: "OK", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ATENCAO: { label: "Atenção", className: "bg-amber-100 text-amber-800 border-amber-200" },
  CRITICO: { label: "Crítico", className: "bg-red-100 text-red-800 border-red-200" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${className}`}
    >
      {label}
    </span>
  );
}

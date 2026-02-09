"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "#0f766e",
  "#7c3aed",
  "#d97706",
  "#059669",
  "#dc2626",
  "#0ea5e9",
  "#6366f1",
  "#84cc16",
];

type Item = { name: string; value: number };

export function CategoriasChart({ data }: { data: Item[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white/80 text-slate-400">
        <p className="text-sm">Nenhuma despesa por categoria no mês</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "var(--shadow-lg)",
            }}
            formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value, entry: { payload?: { value?: number } }) => (
              <span className="text-slate-600">
                {value}: {formatCurrency(entry?.payload?.value ?? 0)}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

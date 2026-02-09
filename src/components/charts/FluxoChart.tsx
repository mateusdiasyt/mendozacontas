"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";

type Point = { date: string; receita: number; despesa: number; saldo: number };

const formatDay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getDate().toString();
};

export function FluxoChart({ data }: { data: Point[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white/80 text-slate-400">
        <p className="text-sm">Nenhum dado no mês para exibir</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "var(--shadow-lg)",
            }}
            labelFormatter={(label) => `Dia ${formatDay(label)}`}
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), ""]}
            labelStyle={{ color: "#64748b" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (value === "receita" ? "Receitas" : "Despesas")}
          />
          <Area
            type="monotone"
            dataKey="receita"
            name="receita"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#gradReceita)"
          />
          <Area
            type="monotone"
            dataKey="despesa"
            name="despesa"
            stroke="#dc2626"
            strokeWidth={2}
            fill="url(#gradDespesa)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

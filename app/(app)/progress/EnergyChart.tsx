"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EnergyDatum {
  day: string;
  avg: number;
}

interface Props {
  data: EnergyDatum[];
}

export default function EnergyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No energy ratings this week yet.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(52, 211, 153, 0.08)" }}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0",
            }}
            formatter={(value) => {
              const numeric =
                typeof value === "number" ? value : Number(value ?? 0);
              return [`${numeric.toFixed(1)} / 5`, "Average energy"];
            }}
          />
          <Bar dataKey="avg" radius={[6, 6, 0, 0]} fill="var(--accent)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

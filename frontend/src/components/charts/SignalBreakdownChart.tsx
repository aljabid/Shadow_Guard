import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getRiskColor } from "@/styles/theme";

interface Signal { signal_name: string; weighted_score: number; score: number; }
interface Props { signals: Signal[]; height?: number; }

export default function SignalBreakdownChart({ signals, height = 180 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={signals} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" domain={[0, 30]} tick={{ fill: "#6b7280", fontSize: 10 }} />
        <YAxis type="category" dataKey="signal_name" tick={{ fill: "#6b7280", fontSize: 10 }} width={130} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 11 }}
          formatter={(v: number) => [`${v}`, "Weighted Score"]}
        />
        <Bar dataKey="weighted_score" radius={2}>
          {signals.map((s, i) => <Cell key={i} fill={getRiskColor(s.score)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

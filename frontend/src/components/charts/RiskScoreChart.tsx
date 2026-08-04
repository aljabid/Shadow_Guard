import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getRiskColor } from "@/styles/theme";

interface DataPoint { timestamp: string; score: number; }
interface Props { data: DataPoint[]; height?: number; }

export default function RiskScoreChart({ data, height = 200 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="timestamp" tick={{ fill: "#6b7280", fontSize: 10 }}
          tickFormatter={(v) => v.slice(11, 16)} />
        <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 11 }}
          formatter={(v: number) => [`${v}/100`, "Risk Score"]}
        />
        <Line type="monotone" dataKey="score" strokeWidth={2} dot={false}
          stroke="#e94560" activeDot={{ r: 4, fill: "#e94560" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

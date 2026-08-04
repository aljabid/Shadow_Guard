import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

interface Event { timestamp: string; risk_score: number; event_label?: string; alert_fired?: boolean; is_afm_action?: boolean; }
interface Props { events: Event[]; height?: number; }

export default function TimelineChart({ events, height = 220 }: Props) {
  const alertEvent = events.find((e) => e.alert_fired && !e.is_afm_action);
  const afmEvent = events.find((e) => e.is_afm_action);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={events} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
        <XAxis dataKey="timestamp" tick={{ fill: "#6b7280", fontSize: 9 }}
          tickFormatter={(v) => v.slice(5, 16)} />
        <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 11 }}
          formatter={(v: number) => [`${v}/100`, "Risk Score"]}
        />
        {alertEvent && (
          <ReferenceLine x={alertEvent.timestamp} stroke="#10b981" strokeDasharray="4 2"
            label={{ value: "ALERT", fill: "#10b981", fontSize: 9 }} />
        )}
        {afmEvent && (
          <ReferenceLine x={afmEvent.timestamp} stroke="#3b82f6" strokeDasharray="4 2"
            label={{ value: "AFM ACTION", fill: "#3b82f6", fontSize: 9 }} />
        )}
        <Line type="monotone" dataKey="risk_score" stroke="#e94560"
          strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

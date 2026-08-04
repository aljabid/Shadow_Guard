import { getRiskColor, getRiskLevel } from "@/styles/theme";

interface Props {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RiskScoreBadge({ score, showLabel = true, size = "md" }: Props) {
  const color = getRiskColor(score);
  const level = getRiskLevel(score);
  const fontSize = size === "sm" ? "10px" : size === "lg" ? "16px" : "12px";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold"
      style={{ background: `${color}18`, color, fontSize, border: `1px solid ${color}40` }}>
      {score}/100
      {showLabel && (
        <span style={{ opacity: 0.8, textTransform: "uppercase", fontSize: "9px" }}>{level}</span>
      )}
    </span>
  );
}

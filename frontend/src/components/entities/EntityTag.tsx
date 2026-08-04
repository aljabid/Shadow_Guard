import { SharedEntity } from "@/types";
import { getRiskColor } from "@/styles/theme";

interface Props { entity: SharedEntity; }

const TYPE_LABELS: Record<string, string> = {
  exchange: "EXC", telegram_channel: "TG", wallet: "WALLET",
  domain: "DOMAIN", betting_platform: "BET", company: "CO",
};

export default function EntityTag({ entity }: Props) {
  const color = getRiskColor(entity.risk_score);
  const label = TYPE_LABELS[entity.entity_type] || entity.entity_type.toUpperCase();
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
      style={{ background: `${color}10`, border: `1px solid ${color}30`, color }}>
      <span style={{ fontSize: 9, opacity: 0.7 }}>{label}</span>
      <span className="font-mono" style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {entity.entity_value.length > 20
          ? entity.entity_value.slice(0, 8) + "..." + entity.entity_value.slice(-6)
          : entity.entity_value}
      </span>
    </span>
  );
}

import { SharedEntity } from "@/types";
import { useInvestigation } from "@/hooks/useInvestigation";
import { Pin, PinOff } from "lucide-react";

interface Props { entity: SharedEntity; }

export default function EntityPinButton({ entity }: Props) {
  const { isPinned, togglePin } = useInvestigation();
  const pinned = isPinned(entity.id);
  return (
    <button onClick={() => togglePin(entity)}
      title={pinned ? "Unpin from investigation" : "Pin to investigation"}
      style={{ color: pinned ? "var(--soc-blue)" : "var(--soc-muted)" }}>
      {pinned ? <PinOff size={12} /> : <Pin size={12} />}
    </button>
  );
}

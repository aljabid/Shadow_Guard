import { ModuleMeta } from "@/types";
import { Lock } from "lucide-react";

interface Props { module: ModuleMeta; }

export default function FutureModuleCard({ module }: Props) {
  return (
    <div className="px-3 py-2 rounded mb-1 flex items-center justify-between"
      style={{ border: "1px solid var(--soc-border)", opacity: 0.5 }}>
      <div>
        <span className="text-xs font-semibold" style={{ color: "var(--soc-muted)" }}>{module.name}</span>
        <p className="text-xs mt-0.5" style={{ color: "var(--soc-muted)", fontSize: 10 }}>Coming soon</p>
      </div>
      <Lock size={10} style={{ color: "var(--soc-muted)" }} />
    </div>
  );
}

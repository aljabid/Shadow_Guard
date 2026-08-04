import { ShieldOff } from "lucide-react";

interface Props { title: string; description?: string; icon?: React.ReactNode; }

export default function EmptyState({ title, description, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3" style={{ color: "var(--soc-muted)" }}>{icon || <ShieldOff size={32} />}</div>
      <p className="font-medium text-sm" style={{ color: "var(--soc-muted)" }}>{title}</p>
      {description && (
        <p className="text-xs mt-1" style={{ color: "var(--soc-muted)", opacity: 0.7 }}>{description}</p>
      )}
    </div>
  );
}

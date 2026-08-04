interface Props {
  children: React.ReactNode;
  variant?: "default" | "accent" | "amber" | "green" | "blue";
}

const STYLES: Record<string, { bg: string; color: string }> = {
  default: { bg: "var(--soc-surface-2)", color: "var(--soc-muted)" },
  accent: { bg: "rgba(233,69,96,0.12)", color: "var(--soc-accent)" },
  amber: { bg: "rgba(245,158,11,0.12)", color: "var(--soc-amber)" },
  green: { bg: "rgba(16,185,129,0.12)", color: "var(--soc-green)" },
  blue: { bg: "rgba(59,130,246,0.12)", color: "var(--soc-blue)" },
};

export default function Badge({ children, variant = "default" }: Props) {
  const style = STYLES[variant];
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: style.bg, color: style.color }}>
      {children}
    </span>
  );
}

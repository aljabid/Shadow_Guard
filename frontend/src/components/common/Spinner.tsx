interface Props { size?: number; color?: string; }

export default function Spinner({ size = 16, color = "var(--soc-accent)" }: Props) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}30`, borderTop: `2px solid ${color}`,
      borderRadius: "50%", animation: "spin 0.8s linear infinite",
    }} />
  );
}

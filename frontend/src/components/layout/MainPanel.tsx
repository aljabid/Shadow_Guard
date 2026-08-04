import React from "react";

interface Props { children: React.ReactNode; title?: string; }

export default function MainPanel({ children, title }: Props) {
  return (
    <div className="h-full flex flex-col">
      {title && <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--soc-text)" }}>{title}</h2>}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

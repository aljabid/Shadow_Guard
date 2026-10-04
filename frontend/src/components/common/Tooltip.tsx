import React, { useState } from "react";

interface Props { children: React.ReactNode; content: string; }

export default function Tooltip({ children, content }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-block"
      onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs whitespace-nowrap z-50"
          style={{ background: "var(--soc-surface-2)", border: "1px solid var(--soc-border)", color: "var(--soc-text)" }}>
          {content}
        </span>
      )}
    </span>
  );
}

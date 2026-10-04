import React from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="card w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: "var(--soc-text)" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--soc-muted)" }}><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function Card({ children, className = "", style, onClick }: Props) {
  return (
    <div className={`card ${className}`}
      style={{ cursor: onClick ? "pointer" : "default", transition: "border-color 0.15s", ...style }}
      onClick={onClick}>
      {children}
    </div>
  );
}

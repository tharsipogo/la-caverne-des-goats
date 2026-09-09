import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`bg-[#121420] p-6 rounded-2xl border ${
        glow ? 'border-amber/50 shadow-xl shadow-amber/5' : 'border-white/10 shadow-2xl'
      } ${className}`}
    >
      {children}
    </div>
  );
}
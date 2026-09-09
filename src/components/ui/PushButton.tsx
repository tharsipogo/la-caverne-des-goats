'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface PushButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Couleur de fond du bouton (ex: '#f5a623') */
  color: string;
  /** Couleur de l'ombre "push" (ex: '#b45309') — par défaut une version assombrie de `color` */
  shadowColor?: string;
  /** Couleur du texte — par défaut sombre pour un fond clair */
  textColor?: string;
}

/**
 * Bouton générique à effet "push" : une ombre pleine (box-shadow) qui
 * s'aplatit quand on clique dessus, pour simuler un appui physique.
 */
export function PushButton({
  children,
  color,
  shadowColor,
  textColor = '#1a1206',
  className = '',
  style,
  disabled,
  ...props
}: PushButtonProps) {
  return (
    <button
      className={`font-serif font-semibold text-sm rounded-xl px-4 py-2.5 border-none cursor-pointer transition-transform active:translate-y-0.5 active:shadow-none disabled:opacity-35 disabled:cursor-not-allowed disabled:translate-y-0 ${className}`}
      style={{
        backgroundColor: color,
        color: textColor,
        boxShadow: disabled ? 'none' : `0 4px 0 ${shadowColor || color}`,
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

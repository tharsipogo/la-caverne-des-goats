import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-amber text-black hover:bg-amber-400 shadow-lg shadow-amber/10',
    secondary: 'bg-surface2 text-white border border-white/10 hover:border-white/20',
    ghost: 'bg-transparent text-slate-300 hover:text-white border border-white/10 hover:border-white/20',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30',
    teal: 'bg-[#4fc9c0]/15 text-[#4fc9c0] border border-[#4fc9c0]/40 hover:bg-[#4fc9c0]/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-xs',
    lg: 'px-6 py-3.5 text-sm',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
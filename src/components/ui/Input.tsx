import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ className = '', error, ...props }: InputProps) {
  return (
    <div className="w-full flex flex-col gap-1">
      <input
        className={`w-full bg-[#1c1e26] border text-white text-xs rounded-xl px-3 py-2.5 outline-none transition-all focus:border-amber placeholder:text-slate-500 disabled:opacity-50 ${
          error ? 'border-red-500' : 'border-white/10'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[10px] text-red-400 font-medium">{error}</span>}
    </div>
  );
}
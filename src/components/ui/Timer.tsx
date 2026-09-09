interface TimerProps {
  seconds: number;
}

export function Timer({ seconds }: TimerProps) {
  const isUrgent = seconds <= 15;

  return (
    <div
      className={`flex items-center justify-center w-14 h-14 rounded-2xl border-2 font-black text-lg transition-all ${
        isUrgent
          ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
          : 'border-amber bg-amber/10 text-amber'
      }`}
    >
      {seconds}s
    </div>
  );
}
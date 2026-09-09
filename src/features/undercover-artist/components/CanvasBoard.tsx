import { RefObject, LegacyRef } from 'react';
import { Button } from '@/components/ui/Button';
import { CANVAS_W, CANVAS_H } from '../hooks/useUndercoverArtistEngine';

interface CanvasBoardProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  drawerReady: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
}

export function CanvasBoard({
  canvasRef,
  drawerReady,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
}: CanvasBoardProps) {
  return (
    <canvas
      ref={canvasRef as LegacyRef<HTMLCanvasElement>}
      width={CANVAS_W}
      height={CANVAS_H}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={`w-full max-w-[640px] aspect-[8/5] rounded-xl border ${
        drawerReady ? 'border-amber cursor-crosshair' : 'border-white/10'
      } bg-[#1c1e26] touch-none`}
    />
  );
}
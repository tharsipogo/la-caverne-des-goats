import { useState, useRef, useEffect } from 'react';
import { DrawPoint } from '../types';

export function useCanvas(onStrokeDraw?: (point: DrawPoint) => void) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawPoint[]>([]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e, true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    isNewStroke = false
  ) => {
    if (!isDrawing && !isNewStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const point: DrawPoint = { x, y, color, size, isNewStroke };
    setStrokes((prev) => [...prev, point]);
    if (onStrokeDraw) onStrokeDraw(point);
  };

  const clearCanvas = () => {
    setStrokes([]);
  };

  const renderStrokes = (pointsToRender: DrawPoint[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < pointsToRender.length; i++) {
      const p = pointsToRender[i];
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';

      if (p.isNewStroke || i === 0) {
        ctx.beginPath();
        ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
      } else {
        ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    renderStrokes(strokes);
  }, [strokes]);

  return {
    canvasRef,
    color,
    setColor,
    size,
    setSize,
    startDrawing,
    stopDrawing,
    draw,
    clearCanvas,
    strokes,
    setStrokes,
  };
}
'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

/**
 * Fond animé fixe : dégradé bleu nuit + deux lueurs de nébuleuse +
 * étoiles fixes qui scintillent. Rendu derrière tout le reste (z-0).
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars: Star[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;

    const buildStars = () => {
      const count = Math.round((width * height) / 3600);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.3,
        baseOpacity: Math.random() * 0.5 + 0.35,
        twinkleSpeed: Math.random() * 1.5 + 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      buildStars();
    };

    const drawBackground = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#07091a');
      grad.addColorStop(0.55, '#060914');
      grad.addColorStop(1, '#04060f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const nebulaA = ctx.createRadialGradient(
        width * 0.85, height * 0.1, 0,
        width * 0.85, height * 0.1, Math.max(width, height) * 0.6
      );
      nebulaA.addColorStop(0, 'rgba(80, 40, 160, 0.07)');
      nebulaA.addColorStop(1, 'rgba(80, 40, 160, 0)');
      ctx.fillStyle = nebulaA;
      ctx.fillRect(0, 0, width, height);

      const nebulaB = ctx.createRadialGradient(
        width * 0.1, height * 0.9, 0,
        width * 0.1, height * 0.9, Math.max(width, height) * 0.6
      );
      nebulaB.addColorStop(0, 'rgba(20, 60, 140, 0.08)');
      nebulaB.addColorStop(1, 'rgba(20, 60, 140, 0)');
      ctx.fillStyle = nebulaB;
      ctx.fillRect(0, 0, width, height);
    };

    const render = (time: number) => {
      drawBackground();
      const t = time / 1000;
      for (const star of stars) {
        const twinkle = Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        const opacity = star.baseOpacity + twinkle * 0.3;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, opacity))})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

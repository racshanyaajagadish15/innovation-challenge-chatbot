'use client';

import { useEffect, useRef } from 'react';

/** Subtle particle wave motion: many small teal/cyan particles on dark blue. */
export function HexagonParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let phase = 0;

    function setSize() {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#070d1a');
      bg.addColorStop(0.5, '#06101f');
      bg.addColorStop(1, '#0d1f33');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      phase += 0.012;

      // Many small particles in a diagonal wave band
      const cols = 120;
      const rows = 22;
      const spacingX = (w * 1.4) / cols;
      const spacingY = (h * 1.2) / rows;
      const originX = -w * 0.2;
      const originY = h * 0.95;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const t = col / cols;
          const wave = 0.06 * h * Math.sin(t * Math.PI * 3 + phase + row * 0.4);
          const x = originX + col * spacingX + (row % 2) * (spacingX * 0.5) + wave;
          const y = originY - row * spacingY - t * h * 0.45;
          const depth = 1 - (t * 0.6 + (row / rows) * 0.35);
          const size = 0.4 + depth * 0.9;
          const alpha = (0.12 + depth * 0.35) * (0.5 + 0.5 * Math.sin(phase * 1.5 + col * 0.08 + row * 0.3));

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
          gradient.addColorStop(0, `rgba(34, 211, 238, ${alpha * 0.8})`);
          gradient.addColorStop(0.4, `rgba(20, 184, 166, ${alpha * 0.25})`);
          gradient.addColorStop(0.8, `rgba(6, 182, 212, ${alpha * 0.04})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, size * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    }

    setSize();
    window.addEventListener('resize', setSize);
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', setSize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full object-cover -z-10"
      style={{ background: '#06101f' }}
      aria-hidden
    />
  );
}

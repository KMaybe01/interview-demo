import { useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

interface Point {
  ox: number;
  oy: number;
  x: number;
  y: number;
}

export default function GridDistortion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);
  const rafRef = useRef(0);

  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const gap = 40;
    const cols = Math.floor(w / gap) + 1;
    const rows = Math.floor(h / gap) + 1;
    const pts: Point[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * gap;
        const y = r * gap;
        pts.push({ ox: x, oy: y, x, y });
      }
    }
    pointsRef.current = pts;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    const onLeave = () => {
      mouseX.set(-9999);
      mouseY.set(-9999);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) return;

    let alive = true;

    function tick(ctx: CanvasRenderingContext2D) {
      if (!alive || typeof window === 'undefined') return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const pts = pointsRef.current;
      const mx = smoothX.get();
      const my = smoothY.get();
      const radius = 80;
      const strength = 18;

      for (const p of pts) {
        const dx = p.ox - mx;
        const dy = p.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let tx = p.ox;
        let ty = p.oy;
        if (dist < radius && dist > 0) {
          const force = (1 - dist / radius) * strength;
          tx += (dx / dist) * force;
          ty += (dy / dist) * force;
        }

        p.x += (tx - p.x) * 0.15;
        p.y += (ty - p.y) * 0.15;
      }

      ctx.clearRect(0, 0, w, h);

      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(102,126,234,0.25)';
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(() => tick(c!));
    }

    rafRef.current = requestAnimationFrame(() => tick(c!));

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [smoothX]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

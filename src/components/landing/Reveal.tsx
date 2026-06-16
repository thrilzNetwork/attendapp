'use client';

import { useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'left' | 'right' | 'none';

const OFFSCREEN: Record<Direction, string> = {
  up: 'translateY(28px)',
  left: 'translateX(-28px)',
  right: 'translateX(28px)',
  none: 'translateY(0)',
};

/**
 * Fade/slide a section in the first time it scrolls into view.
 * Lightweight (IntersectionObserver + CSS transition) — no animation library.
 * Respects prefers-reduced-motion by rendering visible immediately.
 */
export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translate(0,0)' : OFFSCREEN[direction],
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

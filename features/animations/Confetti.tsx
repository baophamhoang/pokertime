'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];

interface Particle {
  id: string;
  x: number;
  color: string;
  rotation: number;
  size: number;
}

interface ConfettiProps {
  active: boolean;
}

export function Confetti({ active }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const newParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      size: Math.random() * 8 + 6,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 3000);
  }, [active]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute top-0 rounded-sm"
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              rotate: p.rotation,
            }}
            initial={{ y: -20, opacity: 1 }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 100 : 900,
              opacity: [1, 1, 0],
              rotate: p.rotation + Math.random() * 720 - 360,
            }}
            transition={{ duration: 2.5 + Math.random(), ease: 'easeIn' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { play } from '@/lib/sounds';

interface DealerTipProps {
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  amount: number;
  active: boolean;
  onComplete: () => void;
}

export function DealerTip({ fromRef, toRef, amount, active, onComplete }: DealerTipProps) {
  const [coords, setCoords] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!active || !fromRef.current || !toRef.current) return;
    const from = fromRef.current.getBoundingClientRect();
    const to = toRef.current.getBoundingClientRect();
    setCoords({
      x: from.left + from.width / 2,
      y: from.top + from.height / 2,
      dx: (to.left + to.width / 2) - (from.left + from.width / 2),
      dy: (to.top + to.height / 2) - (from.top + from.height / 2),
    });
    play('chip_slide');
  }, [active]);

  return (
    <AnimatePresence>
      {active && coords && (
        <motion.div
          className="fixed z-50 pointer-events-none flex items-center gap-1 text-yellow-400 font-bold text-sm"
          style={{ left: coords.x, top: coords.y }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: coords.dx, y: coords.dy, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.8 }}
          onAnimationComplete={onComplete}
        >
          🪙 +{amount}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

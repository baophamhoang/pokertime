'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

const ITEMS: Record<string, string> = {
  tomato: '🍅',
  chip: '🪙',
  heart: '❤️',
  money: '💸',
};

interface ThrowProjectileProps {
  item: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onComplete: () => void;
}

export function ThrowProjectile({ item, fromX, fromY, toX, toY, onComplete }: ThrowProjectileProps) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const emoji = ITEMS[item] ?? '🪙';

  return (
    <motion.div
      className="fixed text-2xl pointer-events-none select-none z-50"
      style={{ left: fromX, top: fromY }}
      animate={{
        x: [0, dx / 2, dx],
        y: [0, -100, dy],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      {emoji}
    </motion.div>
  );
}

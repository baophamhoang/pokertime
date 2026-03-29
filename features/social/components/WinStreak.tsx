'use client';

import { motion } from 'framer-motion';

interface WinStreakProps {
  streak: number;
}

export function WinStreak({ streak }: WinStreakProps) {
  if (streak < 2) return null;

  return (
    <motion.div
      className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 rounded-full px-2 py-0.5"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    >
      <span className="text-sm">🔥</span>
      <span className="text-xs font-bold text-orange-400">{streak}</span>
    </motion.div>
  );
}

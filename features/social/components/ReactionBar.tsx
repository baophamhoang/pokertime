'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['👏', '🔥', '😂', '😮', '❤️', '👎', '💰', '🎉'];

interface ReactionBarProps {
  onReact: (emoji: string) => void;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

export function ReactionBar({ onReact }: ReactionBarProps) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);

  function handleReact(emoji: string) {
    onReact(emoji);
    const id = crypto.randomUUID();
    const x = Math.random() * 60 - 30;
    setFloating((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloating((prev) => prev.filter((f) => f.id !== id)), 1600);
  }

  return (
    <div className="relative flex items-center gap-1">
      <AnimatePresence>
        {floating.map((f) => (
          <motion.span
            key={f.id}
            initial={{ y: 0, opacity: 1, x: f.x }}
            animate={{ y: -80, opacity: 0, x: f.x }}
            exit={{}}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute bottom-8 text-2xl pointer-events-none select-none"
            style={{ left: '50%' }}
          >
            {f.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="text-lg hover:scale-125 transition-transform active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

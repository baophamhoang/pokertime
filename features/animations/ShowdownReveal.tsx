'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from './Confetti';
import type { GameState, Player } from '@/features/game/types';

interface ShowdownRevealProps {
  gameState: GameState;
  players: Player[];
  winnerIds: string[];
}

export function ShowdownReveal({ gameState, players, winnerIds }: ShowdownRevealProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const activePlayers = gameState.playerOrder
    .map((uid) => ({ uid, ps: gameState.playerStates[uid] }))
    .filter(({ ps }) => ps && !ps.isFolded);

  function handleReveal(i: number) {
    if (i === revealedCount) {
      setRevealedCount((v) => v + 1);
      if (i === activePlayers.length - 1) {
        setTimeout(() => setShowConfetti(true), 400);
      }
    }
  }

  return (
    <>
      <Confetti active={showConfetti} />
      <div className="flex flex-wrap justify-center gap-6 p-4">
        {activePlayers.map(({ uid }, i) => {
          const player = players.find((p) => p.userId === uid);
          const isWinner = winnerIds.includes(uid);
          const revealed = i < revealedCount;

          return (
            <motion.div
              key={uid}
              className={`flex flex-col items-center gap-2 cursor-pointer`}
              onClick={() => handleReveal(i)}
            >
              {/* Card (face-down → face-up) */}
              <motion.div
                className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center text-2xl shadow-lg ${
                  isWinner && revealed
                    ? 'border-yellow-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                    : 'border-white/20'
                }`}
                style={{ background: revealed ? 'white' : '#1e293b' }}
                animate={{ rotateY: revealed ? 180 : 0 }}
                transition={{ duration: 0.4, delay: i * 0.3 }}
              >
                {revealed ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.3 + 0.2 }}
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    🃏
                  </motion.span>
                ) : (
                  <span className="text-gray-600">🂠</span>
                )}
              </motion.div>

              <p className={`text-sm font-medium ${isWinner && revealed ? 'text-yellow-400' : 'text-gray-300'}`}>
                {player?.username ?? uid.slice(0, 8)}
                {isWinner && revealed && ' 🏆'}
              </p>
            </motion.div>
          );
        })}
      </div>
      {revealedCount === 0 && (
        <p className="text-center text-sm text-gray-400 mt-2">Tap cards to reveal</p>
      )}
    </>
  );
}

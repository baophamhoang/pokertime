'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Player, PlayerState, GameState } from '@/features/game/types';

interface PlayerSeatProps {
  player: Player;
  playerState?: PlayerState;
  gameState: GameState | null;
  isCurrentUser: boolean;
  isDealer: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  fold: 'Folded',
  check: 'Check',
  call: 'Called',
  raise: 'Raised',
  all_in: 'All In',
};

export function PlayerSeat({ player, playerState, gameState, isCurrentUser, isDealer }: PlayerSeatProps) {
  const isActive = gameState?.currentPlayerUserId === player.userId;
  const isFolded = playerState?.isFolded ?? false;
  const isAllIn = playerState?.isAllIn ?? false;

  return (
    <motion.div
      layout
      className={`relative flex flex-col items-center gap-1.5 ${isFolded ? 'opacity-40' : ''}`}
    >
      {/* Active turn ring */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-gray-900 text-xs font-black flex items-center justify-center z-10">
          D
        </div>
      )}

      {/* Avatar */}
      <div className={`relative w-14 h-14 rounded-full border-2 transition-all ${
        isActive
          ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
          : isCurrentUser
          ? 'border-blue-400'
          : 'border-white/20'
      }`}>
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.username} className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold">
            {player.username[0].toUpperCase()}
          </div>
        )}

        {/* Win streak badge */}
        <AnimatePresence>
          {player.winStreak >= 2 && (
            <motion.div
              className="absolute -bottom-1 -right-1 text-sm"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🔥
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-center max-w-[80px] truncate">
        {player.username}
        {isCurrentUser && <span className="text-gray-500"> (you)</span>}
      </p>

      {/* Chips */}
      <p className="text-xs font-mono text-yellow-400">
        {(playerState?.chips ?? player.chips).toLocaleString()}
      </p>

      {/* Current bet */}
      {playerState && playerState.currentBet > 0 && (
        <div className="text-xs bg-gray-700 rounded-full px-2 py-0.5 text-gray-200">
          {playerState.currentBet}
        </div>
      )}

      {/* Status badge */}
      <AnimatePresence>
        {isAllIn && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            ALL IN
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

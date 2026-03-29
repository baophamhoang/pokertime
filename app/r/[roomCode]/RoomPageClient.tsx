'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Player, PlayerAction, Room } from '@/features/game/types';
import { useGame } from '@/features/game/hooks/useGame';
import { RoomLobby } from '@/features/room/components/RoomLobby';
import { PlayerSeat } from '@/features/player/components/PlayerSeat';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { heartbeat } from '@/features/player/api';
import { play, toggleMute, isMuted } from '@/lib/sounds';

interface RoomPageClientProps {
  room: Room;
  currentUser: User;
  initialPlayers: Record<string, unknown>[];
  initialGame: GameState | null;
}

function mapPlayerRow(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    userId: row.user_id as string,
    username: row.username as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    chips: row.chips as number,
    totalBuyin: row.total_buyin as number,
    winStreak: row.win_streak as number,
    isActive: row.is_active as boolean,
    isReady: row.is_ready as boolean,
    joinedAt: row.joined_at as string,
    lastSeenAt: row.last_seen_at as string,
  };
}

const PHASE_LABELS: Record<string, string> = {
  idle: 'Waiting',
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  ended: 'Ended',
};

export function RoomPageClient({ room, currentUser, initialPlayers, initialGame }: RoomPageClientProps) {
  const mappedPlayers = initialPlayers.map(mapPlayerRow);
  const { gameState, players, isLoading, dispatch } = useGame(room.id, initialGame, mappedPlayers);

  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showWinnerPicker, setShowWinnerPicker] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const prevPhase = useRef(gameState?.phase);

  const currentPlayer = players.find((p) => p.userId === currentUser.id);
  const isHost = room.hostUserId === currentUser.id;
  const isMyTurn = gameState?.currentPlayerUserId === currentUser.id;
  const myState = gameState?.playerStates[currentUser.id];
  const callAmount = myState ? Math.max(0, (gameState?.currentBet ?? 0) - myState.currentBet) : 0;
  const activePlayers = players.filter((p) => p.isActive);

  // Heartbeat
  useEffect(() => {
    if (!currentPlayer) return;
    heartbeat(currentPlayer.id);
    const onFocus = () => heartbeat(currentPlayer.id);
    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => heartbeat(currentPlayer.id), 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [currentPlayer?.id]);

  // Phase sounds
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === 'preflop' && prevPhase.current !== 'preflop') {
      play('chip_shuffle');
    }
    if (gameState.phase === 'showdown' && prevPhase.current !== 'showdown') {
      play('card_flip');
    }
    prevPhase.current = gameState.phase;
  }, [gameState?.phase]);

  // Store room code in localStorage
  useEffect(() => {
    localStorage.setItem('poker_room_code', room.code);
  }, [room.code]);

  // Muted state
  useEffect(() => {
    setMuted(isMuted());
  }, []);

  async function handleAction(action: PlayerAction) {
    if (action === 'fold') play('fold_whoosh');
    await dispatch.action(action, action === 'raise' ? raiseAmount : undefined);
  }

  async function handleStartGame() {
    await dispatch.startHand(activePlayers);
  }

  async function handleAwardPot() {
    if (selectedWinners.length === 0) return;
    play('win_jingle');
    play('chip_slide');
    await dispatch.award(selectedWinners);
    setShowWinnerPicker(false);
    setSelectedWinners([]);
  }

  // Show lobby if idle
  if (!gameState || gameState.phase === 'idle' || gameState.phase === 'ended') {
    return (
      <RoomLobby
        room={room}
        players={players}
        currentUserId={currentUser.id}
        onStartGame={handleStartGame}
      />
    );
  }

  // Game table view
  const dealerIdx = gameState.dealerIndex % gameState.playerOrder.length;

  // Arrange seats: current user at bottom
  const myIndex = gameState.playerOrder.indexOf(currentUser.id);
  const orderedPlayerIds = myIndex === -1
    ? gameState.playerOrder
    : [
        ...gameState.playerOrder.slice(myIndex),
        ...gameState.playerOrder.slice(0, myIndex),
      ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">♠</span>
          <span className="font-mono font-bold text-gray-300">{room.code}</span>
          <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5 text-gray-400 ml-1">
            {PHASE_LABELS[gameState.phase]}
          </span>
          <span className="text-xs text-gray-500 ml-1">Hand #{gameState.handNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { toggleMute(); setMuted(isMuted()); }}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <UserMenu user={currentUser} />
        </div>
      </header>

      {/* Game table */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* Seats grid */}
        <div className="w-full max-w-2xl">
          {/* Other players (top arc) */}
          <div className="flex justify-around items-end mb-8 flex-wrap gap-4">
            {orderedPlayerIds.slice(1).map((userId, i) => {
              const player = players.find((p) => p.userId === userId);
              if (!player) return null;
              const originalIdx = gameState.playerOrder.indexOf(userId);
              return (
                <PlayerSeat
                  key={userId}
                  player={player}
                  playerState={gameState.playerStates[userId]}
                  gameState={gameState}
                  isCurrentUser={false}
                  isDealer={originalIdx === dealerIdx}
                />
              );
            })}
          </div>

          {/* Pot */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gray-800 border border-white/10 rounded-2xl px-8 py-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pot</p>
              <p className="text-3xl font-bold text-yellow-400">{gameState.pot.toLocaleString()}</p>
              {gameState.currentBet > 0 && (
                <p className="text-xs text-gray-500 mt-1">Current bet: {gameState.currentBet}</p>
              )}
            </div>
          </div>

          {/* Current player (bottom) */}
          {myIndex !== -1 && (
            <div className="flex justify-center mb-6">
              <PlayerSeat
                player={players.find((p) => p.userId === currentUser.id)!}
                playerState={myState}
                gameState={gameState}
                isCurrentUser={true}
                isDealer={myIndex === dealerIdx}
              />
            </div>
          )}
        </div>

        {/* Action panel */}
        <AnimatePresence>
          {isMyTurn && myState && !myState.isFolded && !myState.isAllIn && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-3 text-center">
                  Your Turn
                </p>

                {/* Raise input */}
                {gameState.currentBet > 0 && (
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-1 block">Raise to</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRaiseAmount((v) => Math.max(gameState.bigBlind, v - gameState.bigBlind))}
                        className="w-8 h-8 rounded-lg bg-gray-700 text-white text-lg flex items-center justify-center"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={raiseAmount || (gameState.currentBet * 2)}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        className="flex-1 bg-gray-800 text-white text-center rounded-lg py-1.5 font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => setRaiseAmount((v) => (v || gameState.currentBet * 2) + gameState.bigBlind)}
                        className="w-8 h-8 rounded-lg bg-gray-700 text-white text-lg flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('fold')}
                    disabled={isLoading}
                    className="rounded-xl py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm transition-colors"
                  >
                    Fold
                  </button>

                  {callAmount === 0 ? (
                    <button
                      onClick={() => handleAction('check')}
                      disabled={isLoading}
                      className="rounded-xl py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                    >
                      Check
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('call')}
                      disabled={isLoading}
                      className="rounded-xl py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                    >
                      Call {callAmount}
                    </button>
                  )}

                  <button
                    onClick={() => handleAction('raise')}
                    disabled={isLoading || myState.chips === 0}
                    className="rounded-xl py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
                  >
                    Raise
                  </button>

                  <button
                    onClick={() => handleAction('all_in')}
                    disabled={isLoading}
                    className="rounded-xl py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                  >
                    All In ({myState.chips})
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Host controls */}
        {isHost && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => dispatch.advancePhase()}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-4 py-2 transition-colors"
            >
              Next Phase →
            </button>
            <button
              onClick={() => setShowWinnerPicker(true)}
              className="text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg px-4 py-2 transition-colors"
            >
              Award Pot
            </button>
            <button
              onClick={() => dispatch.startHand(activePlayers)}
              className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 transition-colors"
            >
              Next Hand
            </button>
          </div>
        )}
      </div>

      {/* Winner Picker Modal */}
      <AnimatePresence>
        {showWinnerPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4"
            >
              <h3 className="text-lg font-bold mb-1">Award Pot</h3>
              <p className="text-sm text-gray-400 mb-4">Select winner(s) to split the pot</p>
              <p className="text-2xl font-bold text-yellow-400 mb-4">{gameState.pot.toLocaleString()} chips</p>

              <div className="space-y-2 mb-4">
                {gameState.playerOrder.map((userId) => {
                  const player = players.find((p) => p.userId === userId);
                  const ps = gameState.playerStates[userId];
                  if (!player || ps?.isFolded) return null;
                  const selected = selectedWinners.includes(userId);
                  return (
                    <button
                      key={userId}
                      onClick={() => setSelectedWinners((prev) =>
                        selected ? prev.filter((id) => id !== userId) : [...prev, userId]
                      )}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors border ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-500'}`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="font-medium">{player.username}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowWinnerPicker(false); setSelectedWinners([]); }}
                  className="flex-1 rounded-xl py-2.5 bg-gray-700 text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardPot}
                  disabled={selectedWinners.length === 0}
                  className="flex-1 rounded-xl py-2.5 bg-yellow-500 disabled:opacity-40 text-gray-900 font-semibold transition-colors"
                >
                  Award
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

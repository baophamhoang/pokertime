'use client';

import { useState } from 'react';
import type { Player, Room } from '@/features/game/types';
import { setReady } from '@/features/player/api';

interface RoomLobbyProps {
  room: Room;
  players: Player[];
  currentUserId: string;
  onStartGame: () => Promise<void>;
}

export function RoomLobby({ room, players, currentUserId, onStartGame }: RoomLobbyProps) {
  const [starting, setStarting] = useState(false);
  const isHost = room.hostUserId === currentUserId;
  const currentPlayer = players.find((p) => p.userId === currentUserId);
  const readyCount = players.filter((p) => p.isReady).length;
  const canStart = isHost && readyCount >= 2;

  async function handleToggleReady() {
    if (!currentPlayer) return;
    await setReady(currentPlayer.id, !currentPlayer.isReady);
  }

  async function handleStart() {
    setStarting(true);
    try {
      await onStartGame();
    } finally {
      setStarting(false);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Room Code</p>
            <p className="text-xl font-mono font-bold tracking-widest text-emerald-400">{room.code}</p>
          </div>
        </div>
        <button
          onClick={copyInvite}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy invite link
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Players ({players.length})</h2>
            <span className="text-sm text-gray-400">{readyCount}/{players.length} ready</span>
          </div>

          <div className="space-y-2 mb-6">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 bg-gray-900 border border-white/5 rounded-xl px-4 py-3"
              >
                {player.avatarUrl ? (
                  <img src={player.avatarUrl} alt={player.username} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-sm font-bold">
                    {player.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {player.username}
                    {player.userId === currentUserId && (
                      <span className="ml-1.5 text-xs text-gray-500">(you)</span>
                    )}
                    {player.userId === room.hostUserId && (
                      <span className="ml-1.5 text-xs text-yellow-500">host</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{player.chips.toLocaleString()} chips</p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${player.isReady ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {currentPlayer && (
              <button
                onClick={handleToggleReady}
                className={`w-full rounded-xl py-3 font-semibold transition-colors ${
                  currentPlayer.isReady
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                }`}
              >
                {currentPlayer.isReady ? 'Not Ready' : 'Ready Up'}
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full rounded-xl py-3 font-semibold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 transition-colors"
              >
                {starting ? 'Starting…' : `Start Game${!canStart ? ` (need ${2 - readyCount} more)` : ''}`}
              </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-center text-sm text-gray-500">
            <p>Blinds: {room.smallBlind}/{room.bigBlind} &middot; Starting: {room.startingChips.toLocaleString()} chips</p>
          </div>
        </div>
      </main>
    </div>
  );
}

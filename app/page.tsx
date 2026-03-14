'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@/features/auth/components/SignInButton';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createRoom } from '@/features/room/api';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const room = await createRoom({
        hostUserId: user.id,
        startingChips,
        smallBlind,
        bigBlind,
      });
      localStorage.setItem('poker_room_code', room.code);
      router.push(`/r/${room.code}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const code = joinCode.trim().toUpperCase();
      localStorage.setItem('poker_room_code', code);
      router.push(`/r/${code}`);
    } catch {
      setJoinError('Room not found. Check your code and try again.');
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">♠</span>
          <span className="text-lg font-bold tracking-tight">PokerTime</span>
        </div>
        {user ? <UserMenu user={user} /> : null}
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {!user ? (
          /* Unauthenticated state */
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">♠♥♦♣</div>
            <h1 className="text-4xl font-bold mb-3">Poker Night, Online</h1>
            <p className="text-gray-400 mb-8 text-lg">
              Real-time chip tracking for your home game. Sign in to create or join a room.
            </p>
            <SignInButton />
          </div>
        ) : (
          /* Authenticated state */
          <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-6">
            {/* Create Room */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Create Room</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                    Starting Chips
                  </label>
                  <input
                    type="number"
                    value={startingChips}
                    onChange={(e) => setStartingChips(Number(e.target.value))}
                    min={100}
                    step={100}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                      Small Blind
                    </label>
                    <input
                      type="number"
                      value={smallBlind}
                      onChange={(e) => setSmallBlind(Number(e.target.value))}
                      min={1}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                      Big Blind
                    </label>
                    <input
                      type="number"
                      value={bigBlind}
                      onChange={(e) => setBigBlind(Number(e.target.value))}
                      min={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {creating ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </div>

            {/* Join Room */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Join Room</h2>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABCDEF"
                    maxLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-lg tracking-widest placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                  {joinError && <p className="text-red-400 text-xs mt-1">{joinError}</p>}
                </div>
                <button
                  type="submit"
                  disabled={joining || joinCode.length < 6}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {joining ? 'Joining…' : 'Join Room'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

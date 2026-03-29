import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { getRoomByCode } from '@/features/room/api';
import { getGame } from '@/features/game/api';
import { RoomPageClient } from './RoomPageClient';

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { roomCode } = await params;

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to join this room.</p>
          <a href="/" className="text-emerald-400 hover:underline">Go to home</a>
        </div>
      </div>
    );
  }

  const room = await getRoomByCode(roomCode);
  if (!room) notFound();

  // Upsert player row server-side
  await supabase.from('players').upsert(
    {
      room_id: room.id,
      user_id: user.id,
      username:
        (user.user_metadata?.full_name as string) ??
        (user.user_metadata?.name as string) ??
        user.email?.split('@')[0] ??
        'Player',
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'room_id,user_id', ignoreDuplicates: false }
  );

  const { data: playersData } = await supabase
    .from('players')
    .select()
    .eq('room_id', room.id)
    .eq('is_active', true)
    .order('joined_at');

  const initialGame = await getGame(room.id);

  return (
    <RoomPageClient
      room={room}
      currentUser={user}
      initialPlayers={playersData ?? []}
      initialGame={initialGame}
    />
  );
}

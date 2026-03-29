import { supabaseBrowser } from '@/lib/supabase';
import type { Player } from '@/features/game/types';
import type { User } from '@supabase/supabase-js';

function mapPlayer(row: Record<string, unknown>): Player {
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

export async function joinRoom(roomId: string, user: User): Promise<Player> {
  const supabase = supabaseBrowser();
  const username =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Player';
  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  const { data, error } = await supabase
    .from('players')
    .upsert(
      {
        room_id: roomId,
        user_id: user.id,
        username,
        avatar_url: avatarUrl,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,user_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return mapPlayer(data);
}

export async function updateProfile(
  playerId: string,
  updates: { nickname?: string; avatar_url?: string }
): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase
    .from('players')
    .update({ username: updates.nickname, avatar_url: updates.avatar_url })
    .eq('id', playerId);
  if (error) throw error;
}

export async function setReady(playerId: string, ready: boolean): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase
    .from('players')
    .update({ is_ready: ready })
    .eq('id', playerId);
  if (error) throw error;
}

export async function leaveRoom(playerId: string): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase
    .from('players')
    .update({ is_active: false })
    .eq('id', playerId);
  if (error) throw error;
}

export async function heartbeat(playerId: string): Promise<void> {
  const supabase = supabaseBrowser();
  await supabase
    .from('players')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', playerId);
}

export async function getPlayersInRoom(roomId: string): Promise<Player[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('room_id', roomId)
    .eq('is_active', true)
    .order('joined_at');
  if (error) throw error;
  return (data ?? []).map(mapPlayer);
}

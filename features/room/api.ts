import { supabaseBrowser } from '@/lib/supabase';
import type { Room } from '@/features/game/types';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => chars[b % chars.length])
    .join('');
}

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    code: row.code as string,
    hostUserId: row.host_user_id as string,
    startingChips: row.starting_chips as number,
    smallBlind: row.small_blind as number,
    bigBlind: row.big_blind as number,
    createdAt: row.created_at as string,
  };
}

export async function createRoom(params: {
  hostUserId: string;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
}): Promise<Room> {
  const supabase = supabaseBrowser();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_user_id: params.hostUserId,
        starting_chips: params.startingChips,
        small_blind: params.smallBlind,
        big_blind: params.bigBlind,
      })
      .select()
      .single();

    if (!error && data) return mapRoom(data);
    if (error?.code !== '23505') throw error; // 23505 = unique violation
  }

  throw new Error('Failed to generate unique room code after 5 attempts');
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return null;
  return mapRoom(data);
}

export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = supabaseBrowser();
  await supabase.from('rooms').delete().eq('id', roomId);
}

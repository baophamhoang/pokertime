import { supabaseBrowser } from '@/lib/supabase';
import type { ChipAction } from '@/features/game/types';

function mapChipAction(row: Record<string, unknown>): ChipAction {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    playerId: row.player_id as string,
    userId: row.user_id as string,
    amount: row.amount as number,
    chipsBefore: row.chips_before as number,
    chipsAfter: row.chips_after as number,
    createdAt: row.created_at as string,
  };
}

interface ChipActionParams {
  roomId: string;
  playerId: string;
  userId: string;
  amount: number;
  chipsBefore: number;
  chipsAfter: number;
}

export async function recordBuyin(params: ChipActionParams): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase.from('chip_actions').insert({
    room_id: params.roomId,
    player_id: params.playerId,
    user_id: params.userId,
    amount: Math.abs(params.amount),
    chips_before: params.chipsBefore,
    chips_after: params.chipsAfter,
  });
  if (error) throw error;

  await supabase
    .from('players')
    .update({
      chips: params.chipsAfter,
      total_buyin: supabase.rpc('increment', { x: params.amount }),
    })
    .eq('id', params.playerId);
}

export async function recordCashout(params: ChipActionParams): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase.from('chip_actions').insert({
    room_id: params.roomId,
    player_id: params.playerId,
    user_id: params.userId,
    amount: -Math.abs(params.amount),
    chips_before: params.chipsBefore,
    chips_after: params.chipsAfter,
  });
  if (error) throw error;

  await supabase
    .from('players')
    .update({ chips: params.chipsAfter })
    .eq('id', params.playerId);
}

export async function getChipHistory(roomId: string): Promise<ChipAction[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('chip_actions')
    .select()
    .eq('room_id', roomId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapChipAction);
}

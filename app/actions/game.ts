'use server';

import { supabaseServer } from '@/lib/supabase-server';
import type { GameState, PlayerAction } from '@/features/game/types';
import { applyAction, computeAwards, computeFinalChips } from '@/features/game/engine';

async function getGameFromDb(supabase: Awaited<ReturnType<typeof supabaseServer>>, roomId: string): Promise<GameState | null> {
  const { data } = await supabase.from('games').select().eq('room_id', roomId).single();
  if (!data) return null;
  return {
    id: data.id,
    roomId: data.room_id,
    handNumber: data.hand_number,
    phase: data.phase,
    pot: data.pot,
    currentBet: data.current_bet,
    dealerIndex: data.dealer_index,
    currentPlayerUserId: data.current_player_user_id ?? null,
    playerOrder: data.player_order ?? [],
    playerStates: data.player_states ?? {},
    smallBlind: data.small_blind,
    bigBlind: data.big_blind,
    updatedAt: data.updated_at,
  };
}

export async function serverRecordAction(
  roomId: string,
  action: PlayerAction,
  raiseAmount?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const state = await getGameFromDb(supabase, roomId);
  if (!state) return { success: false, error: 'Game not found' };
  if (state.currentPlayerUserId !== user.id) {
    return { success: false, error: 'Not your turn' };
  }

  const next = applyAction(state, user.id, action, raiseAmount);

  const { error } = await supabase.from('games').update({
    pot: next.pot,
    current_bet: next.currentBet,
    current_player_user_id: next.currentPlayerUserId,
    player_states: next.playerStates,
    updated_at: new Date().toISOString(),
  }).eq('id', state.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function serverAwardPot(
  roomId: string,
  winnerUserIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single();
  if (!room || room.host_user_id !== user.id) {
    return { success: false, error: 'Only the host can award the pot' };
  }

  const state = await getGameFromDb(supabase, roomId);
  if (!state) return { success: false, error: 'Game not found' };

  const awards = computeAwards(state, winnerUserIds);
  const finalChips = computeFinalChips(state, awards);

  for (const [userId, chips] of Object.entries(finalChips)) {
    await supabase.from('players').update({ chips }).eq('room_id', roomId).eq('user_id', userId);
  }

  await supabase.from('games').update({
    phase: 'idle',
    pot: 0,
    current_bet: 0,
    current_player_user_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', state.id);

  return { success: true };
}

import { supabaseBrowser } from '@/lib/supabase';
import {
  applyBlinds,
  applyAction,
  buildInitialPlayerStates,
  buildValidatedSeatOrder,
  computeAwards,
  computeFinalChips,
  getFirstToAct,
  getNextPhase,
  resetRoundState,
  shouldGoToShowdown,
} from './engine';
import type { GameState, Player, PlayerAction } from './types';

function mapGame(row: Record<string, unknown>): GameState {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    handNumber: row.hand_number as number,
    phase: row.phase as GameState['phase'],
    pot: row.pot as number,
    currentBet: row.current_bet as number,
    dealerIndex: row.dealer_index as number,
    currentPlayerUserId: (row.current_player_user_id as string) ?? null,
    playerOrder: (row.player_order as string[]) ?? [],
    playerStates: (row.player_states as GameState['playerStates']) ?? {},
    smallBlind: row.small_blind as number,
    bigBlind: row.big_blind as number,
    updatedAt: row.updated_at as string,
  };
}

export async function getGame(roomId: string): Promise<GameState | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('games')
    .select()
    .eq('room_id', roomId)
    .single();
  if (error || !data) return null;
  return mapGame(data);
}

export async function saveGame(state: GameState): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase
    .from('games')
    .upsert({
      id: state.id,
      room_id: state.roomId,
      hand_number: state.handNumber,
      phase: state.phase,
      pot: state.pot,
      current_bet: state.currentBet,
      dealer_index: state.dealerIndex,
      current_player_user_id: state.currentPlayerUserId,
      player_order: state.playerOrder,
      player_states: state.playerStates,
      small_blind: state.smallBlind,
      big_blind: state.bigBlind,
    });
  if (error) throw error;
}

export async function startHand(roomId: string, players: Player[]): Promise<GameState> {
  const existing = await getGame(roomId);
  const supabase = supabaseBrowser();
  const { data: room } = await supabase.from('rooms').select().eq('id', roomId).single();
  if (!room) throw new Error('Room not found');

  const playerOrder = buildValidatedSeatOrder(players);
  const handNumber = (existing?.handNumber ?? 0) + 1;
  const dealerIndex = existing
    ? (existing.dealerIndex + 1) % playerOrder.length
    : 0;

  let state: GameState = {
    id: existing?.id ?? crypto.randomUUID(),
    roomId,
    handNumber,
    phase: 'preflop',
    pot: 0,
    currentBet: 0,
    dealerIndex,
    currentPlayerUserId: null,
    playerOrder,
    playerStates: buildInitialPlayerStates(playerOrder, players),
    smallBlind: room.small_blind,
    bigBlind: room.big_blind,
    updatedAt: new Date().toISOString(),
  };

  const n = playerOrder.length;
  const sbIdx = n === 2 ? dealerIndex % n : (dealerIndex + 1) % n;
  const bbIdx = (sbIdx + 1) % n;
  state = applyBlinds(state, playerOrder[sbIdx], playerOrder[bbIdx]);
  state.currentPlayerUserId = getFirstToAct(state);

  await saveGame(state);
  return state;
}

export async function advancePhase(roomId: string): Promise<GameState> {
  const state = await getGame(roomId);
  if (!state) throw new Error('No game found');

  if (shouldGoToShowdown(state)) {
    const next = { ...state, phase: 'showdown' as const };
    await saveGame(next);
    return next;
  }

  const nextPhase = getNextPhase(state.phase);
  let next = resetRoundState({ ...state, phase: nextPhase });
  next = { ...next, currentPlayerUserId: getFirstToAct(next) };
  await saveGame(next);
  return next;
}

export async function recordAction(
  roomId: string,
  userId: string,
  action: PlayerAction,
  raiseAmount?: number
): Promise<GameState> {
  const state = await getGame(roomId);
  if (!state) throw new Error('No game found');

  const next = applyAction(state, userId, action, raiseAmount);
  await saveGame(next);
  return next;
}

export async function awardPot(
  roomId: string,
  winnerUserIds: string[]
): Promise<void> {
  const state = await getGame(roomId);
  if (!state) throw new Error('No game found');
  const supabase = supabaseBrowser();

  const awards = computeAwards(state, winnerUserIds);
  const finalChips = computeFinalChips(state, awards);

  // Update player chips in DB
  for (const [userId, chips] of Object.entries(finalChips)) {
    await supabase
      .from('players')
      .update({ chips, win_streak: winnerUserIds.includes(userId) ? supabase.rpc('increment_win_streak', { uid: userId, rid: roomId }) : 0 })
      .eq('room_id', roomId)
      .eq('user_id', userId);
  }

  // Transition to idle
  const next: GameState = {
    ...state,
    phase: 'idle',
    pot: 0,
    currentBet: 0,
    currentPlayerUserId: null,
    updatedAt: new Date().toISOString(),
  };
  await saveGame(next);
}

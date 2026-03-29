'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import type { GameState, Player, PlayerAction } from '@/features/game/types';
import { recordAction, advancePhase, awardPot, startHand } from '@/features/game/api';

interface UseGameReturn {
  gameState: GameState | null;
  players: Player[];
  isLoading: boolean;
  dispatch: {
    action: (action: PlayerAction, raiseAmount?: number) => Promise<void>;
    advancePhase: () => Promise<void>;
    award: (winnerIds: string[]) => Promise<void>;
    startHand: (activePlayers: Player[]) => Promise<void>;
  };
}

export function useGame(roomId: string, initialGame: GameState | null, initialPlayers: Player[]): UseGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(initialGame);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useRef(supabaseBrowser());

  useEffect(() => {
    const channel = supabase.current
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.new) setGameState(mapGameRow(payload.new as Record<string, unknown>));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPlayers((prev) => prev.filter((p) => p.id !== (payload.old as { id: string }).id));
          } else if (payload.new) {
            const updated = mapPlayerRow(payload.new as Record<string, unknown>);
            setPlayers((prev) => {
              const idx = prev.findIndex((p) => p.id === updated.id);
              if (idx === -1) return [...prev, updated];
              const next = [...prev];
              next[idx] = updated;
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [roomId]);

  async function dispatchAction(action: PlayerAction, raiseAmount?: number) {
    const userId = (await supabase.current.auth.getUser()).data.user?.id;
    if (!userId) return;
    setIsLoading(true);
    try {
      await recordAction(roomId, userId, action, raiseAmount);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    gameState,
    players,
    isLoading,
    dispatch: {
      action: dispatchAction,
      advancePhase: () => advancePhase(roomId).then(() => {}),
      award: (winnerIds) => awardPot(roomId, winnerIds),
      startHand: (activePlayers) => startHand(roomId, activePlayers).then(() => {}),
    },
  };
}

function mapGameRow(row: Record<string, unknown>): GameState {
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

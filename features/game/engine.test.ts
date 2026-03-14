import { describe, expect, it } from 'vitest';
import {
  applyAction,
  applyBlinds,
  buildInitialPlayerStates,
  buildValidatedSeatOrder,
  computeAwards,
  computeFinalChips,
  getFirstToAct,
  getNextPhase,
  getNextToAct,
  isRoundComplete,
  resetRoundState,
  shouldGoToShowdown,
} from './engine';
import type { GameState, Player } from './types';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    roomId: 'room-1',
    userId: `user-${i}`,
    username: `Player ${i}`,
    avatarUrl: null,
    chips: 1000,
    totalBuyin: 1000,
    winStreak: 0,
    isActive: true,
    isReady: true,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  }));
}

function makeGameState(players: Player[], overrides?: Partial<GameState>): GameState {
  const playerOrder = players.map((p) => p.userId);
  const playerStates = buildInitialPlayerStates(playerOrder, players);
  return {
    id: 'game-1',
    roomId: 'room-1',
    handNumber: 1,
    phase: 'preflop',
    pot: 0,
    currentBet: 0,
    dealerIndex: 0,
    currentPlayerUserId: playerOrder[0],
    playerOrder,
    playerStates,
    smallBlind: 10,
    bigBlind: 20,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('buildValidatedSeatOrder', () => {
  it('returns user ids for 2 players', () => {
    const players = makePlayers(2);
    expect(buildValidatedSeatOrder(players)).toEqual(['user-0', 'user-1']);
  });

  it('throws for 1 player', () => {
    expect(() => buildValidatedSeatOrder(makePlayers(1))).toThrow();
  });

  it('throws for 10 players', () => {
    expect(() => buildValidatedSeatOrder(makePlayers(10))).toThrow();
  });

  it('accepts 9 players', () => {
    expect(buildValidatedSeatOrder(makePlayers(9))).toHaveLength(9);
  });
});

describe('applyBlinds', () => {
  it('posts SB and BB for 3 players', () => {
    const players = makePlayers(3);
    let state = makeGameState(players, { dealerIndex: 0 });
    // SB = user-1, BB = user-2
    state = applyBlinds(state, 'user-1', 'user-2');
    expect(state.playerStates['user-1'].chips).toBe(990);
    expect(state.playerStates['user-1'].currentBet).toBe(10);
    expect(state.playerStates['user-2'].chips).toBe(980);
    expect(state.playerStates['user-2'].currentBet).toBe(20);
    expect(state.pot).toBe(30);
    expect(state.currentBet).toBe(20);
  });

  it('heads-up: dealer posts SB', () => {
    const players = makePlayers(2);
    let state = makeGameState(players, { dealerIndex: 0 });
    state = applyBlinds(state, 'user-0', 'user-1');
    // Dealer (user-0) posts SB
    expect(state.playerStates['user-0'].currentBet).toBe(10);
    expect(state.playerStates['user-1'].currentBet).toBe(20);
  });
});

describe('applyAction', () => {
  it('fold marks player as folded', () => {
    const players = makePlayers(3);
    const state = makeGameState(players);
    const next = applyAction(state, 'user-0', 'fold');
    expect(next.playerStates['user-0'].isFolded).toBe(true);
  });

  it('check sets hasBettedThisRound', () => {
    const players = makePlayers(3);
    const state = makeGameState(players);
    const next = applyAction(state, 'user-0', 'check');
    expect(next.playerStates['user-0'].hasBettedThisRound).toBe(true);
  });

  it('call deducts correct chips', () => {
    const players = makePlayers(3);
    let state = makeGameState(players, { currentBet: 20 });
    state = applyAction(state, 'user-0', 'call');
    expect(state.playerStates['user-0'].chips).toBe(980);
    expect(state.pot).toBe(20);
  });

  it('raise increases current bet and resets others', () => {
    const players = makePlayers(3);
    let state = makeGameState(players, { currentBet: 20, currentPlayerUserId: 'user-0' });
    // Set user-1 as already betted
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], hasBettedThisRound: true };
    state = applyAction(state, 'user-0', 'raise', 60);
    expect(state.currentBet).toBe(60);
    expect(state.playerStates['user-1'].hasBettedThisRound).toBe(false);
  });

  it('all_in sets isAllIn and chips to 0', () => {
    const players = makePlayers(2);
    const state = makeGameState(players);
    const next = applyAction(state, 'user-0', 'all_in');
    expect(next.playerStates['user-0'].isAllIn).toBe(true);
    expect(next.playerStates['user-0'].chips).toBe(0);
    expect(next.pot).toBe(1000);
  });
});

describe('isRoundComplete', () => {
  it('returns true when all active players have bet and matched', () => {
    const players = makePlayers(2);
    const state = makeGameState(players, { currentBet: 20 });
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], currentBet: 20, hasBettedThisRound: true };
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], currentBet: 20, hasBettedThisRound: true };
    expect(isRoundComplete(state)).toBe(true);
  });

  it('returns false when a player has not acted', () => {
    const players = makePlayers(2);
    const state = makeGameState(players, { currentBet: 20 });
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], currentBet: 20, hasBettedThisRound: true };
    expect(isRoundComplete(state)).toBe(false);
  });
});

describe('shouldGoToShowdown', () => {
  it('returns true when only 1 active player', () => {
    const players = makePlayers(3);
    const state = makeGameState(players);
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], isFolded: true };
    state.playerStates['user-2'] = { ...state.playerStates['user-2'], isFolded: true };
    expect(shouldGoToShowdown(state)).toBe(true);
  });

  it('returns false when 2+ active non-all-in players', () => {
    const players = makePlayers(3);
    const state = makeGameState(players);
    expect(shouldGoToShowdown(state)).toBe(false);
  });

  it('returns true when remaining active are all all-in', () => {
    const players = makePlayers(2);
    const state = makeGameState(players);
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], isAllIn: true };
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], isAllIn: true };
    expect(shouldGoToShowdown(state)).toBe(true);
  });
});

describe('getNextPhase', () => {
  it('progresses correctly', () => {
    expect(getNextPhase('idle')).toBe('preflop');
    expect(getNextPhase('preflop')).toBe('flop');
    expect(getNextPhase('flop')).toBe('turn');
    expect(getNextPhase('turn')).toBe('river');
    expect(getNextPhase('river')).toBe('showdown');
    expect(getNextPhase('showdown')).toBe('idle');
  });
});

describe('computeAwards', () => {
  it('single winner gets entire pot', () => {
    const players = makePlayers(2);
    let state = makeGameState(players, { pot: 200 });
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], totalBetThisRound: 100 };
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], totalBetThisRound: 100 };
    const awards = computeAwards(state, ['user-0']);
    expect(awards['user-0']).toBe(200);
  });

  it('split pot between two winners', () => {
    const players = makePlayers(2);
    let state = makeGameState(players, { pot: 200 });
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], totalBetThisRound: 100 };
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], totalBetThisRound: 100 };
    const awards = computeAwards(state, ['user-0', 'user-1']);
    expect(awards['user-0'] + awards['user-1']).toBe(200);
  });
});

describe('computeFinalChips', () => {
  it('adds awards to remaining chips', () => {
    const players = makePlayers(2);
    const state = makeGameState(players);
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], chips: 500 };
    const awards = { 'user-0': 300 };
    const result = computeFinalChips(state, awards);
    expect(result['user-0']).toBe(800);
    expect(result['user-1']).toBe(1000);
  });
});

describe('resetRoundState', () => {
  it('clears currentBet and hasBettedThisRound', () => {
    const players = makePlayers(2);
    const state = makeGameState(players, { currentBet: 50 });
    state.playerStates['user-0'] = { ...state.playerStates['user-0'], currentBet: 50, hasBettedThisRound: true };
    const reset = resetRoundState(state);
    expect(reset.currentBet).toBe(0);
    expect(reset.playerStates['user-0'].currentBet).toBe(0);
    expect(reset.playerStates['user-0'].hasBettedThisRound).toBe(false);
  });
});

describe('getFirstToAct', () => {
  it('preflop 3 players: first is left of BB (dealer+3)', () => {
    const players = makePlayers(3);
    const state = makeGameState(players, { dealerIndex: 0, phase: 'preflop' });
    // Dealer=0, SB=1, BB=2, first=0
    expect(getFirstToAct(state)).toBe('user-0');
  });
});

describe('getNextToAct', () => {
  it('returns next non-folded player', () => {
    const players = makePlayers(3);
    const state = makeGameState(players, { currentPlayerUserId: 'user-0' });
    expect(getNextToAct(state)).toBe('user-1');
  });

  it('skips folded players', () => {
    const players = makePlayers(3);
    const state = makeGameState(players, { currentPlayerUserId: 'user-0' });
    state.playerStates['user-1'] = { ...state.playerStates['user-1'], isFolded: true };
    expect(getNextToAct(state)).toBe('user-2');
  });
});

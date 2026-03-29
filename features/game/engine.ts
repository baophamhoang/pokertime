import type { GamePhase, GameState, PlayerAction, PlayerState } from './types';
import type { Player } from './types';

export function computeSeatOrder(players: Player[]): string[] {
  return players.map((p) => p.userId);
}

export function buildValidatedSeatOrder(players: Player[]): string[] {
  const active = players.filter((p) => p.isActive);
  if (active.length < 2 || active.length > 9) {
    throw new Error(`Invalid player count: ${active.length}. Must be 2–9.`);
  }
  return computeSeatOrder(active);
}

export function buildInitialPlayerStates(
  playerOrder: string[],
  players: Player[]
): Record<string, PlayerState> {
  const states: Record<string, PlayerState> = {};
  for (const userId of playerOrder) {
    const player = players.find((p) => p.userId === userId);
    if (!player) continue;
    states[userId] = {
      userId,
      chips: player.chips,
      currentBet: 0,
      totalBetThisRound: 0,
      isFolded: false,
      isAllIn: false,
      isActive: true,
      hasBettedThisRound: false,
    };
  }
  return states;
}

export function applyBlinds(
  state: GameState,
  smallBlindUserId: string,
  bigBlindUserId: string
): GameState {
  const newStates = { ...state.playerStates };

  // Heads-up rule: dealer posts SB
  const sbUserId =
    state.playerOrder.length === 2
      ? state.playerOrder[state.dealerIndex % state.playerOrder.length]
      : smallBlindUserId;
  const bbUserId =
    state.playerOrder.length === 2
      ? state.playerOrder[(state.dealerIndex + 1) % state.playerOrder.length]
      : bigBlindUserId;

  const sbPlayer = { ...newStates[sbUserId] };
  const sbAmount = Math.min(state.smallBlind, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalBetThisRound = sbAmount;
  sbPlayer.isAllIn = sbPlayer.chips === 0;
  newStates[sbUserId] = sbPlayer;

  const bbPlayer = { ...newStates[bbUserId] };
  const bbAmount = Math.min(state.bigBlind, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  bbPlayer.totalBetThisRound = bbAmount;
  bbPlayer.isAllIn = bbPlayer.chips === 0;
  newStates[bbUserId] = bbPlayer;

  return {
    ...state,
    pot: state.pot + sbAmount + bbAmount,
    currentBet: bbAmount,
    playerStates: newStates,
  };
}

export function getFirstToAct(state: GameState): string | null {
  const { playerOrder, dealerIndex, playerStates, phase } = state;
  const n = playerOrder.length;

  if (phase === 'preflop') {
    // First to act is after BB (index: dealer+3 for 3+ players, dealer for HU)
    const startIdx =
      n === 2
        ? dealerIndex % n
        : (dealerIndex + 3) % n;
    for (let i = 0; i < n; i++) {
      const userId = playerOrder[(startIdx + i) % n];
      const ps = playerStates[userId];
      if (ps && !ps.isFolded && !ps.isAllIn) return userId;
    }
  } else {
    // Post-flop: first active player after dealer
    const startIdx = (dealerIndex + 1) % n;
    for (let i = 0; i < n; i++) {
      const userId = playerOrder[(startIdx + i) % n];
      const ps = playerStates[userId];
      if (ps && !ps.isFolded && !ps.isAllIn) return userId;
    }
  }
  return null;
}

export function getNextToAct(state: GameState): string | null {
  const { playerOrder, currentPlayerUserId, playerStates } = state;
  if (!currentPlayerUserId) return null;
  const n = playerOrder.length;
  const currentIdx = playerOrder.indexOf(currentPlayerUserId);
  if (currentIdx === -1) return null;

  for (let i = 1; i < n; i++) {
    const userId = playerOrder[(currentIdx + i) % n];
    const ps = playerStates[userId];
    if (ps && !ps.isFolded && !ps.isAllIn) return userId;
  }
  return null;
}

export function isRoundComplete(state: GameState): boolean {
  const active = Object.values(state.playerStates).filter(
    (ps) => !ps.isFolded && !ps.isAllIn
  );

  if (active.length === 0) return true;

  return active.every(
    (ps) =>
      ps.hasBettedThisRound &&
      (ps.currentBet >= state.currentBet || ps.isAllIn)
  );
}

export function shouldGoToShowdown(state: GameState): boolean {
  const active = Object.values(state.playerStates).filter((ps) => !ps.isFolded);
  const notAllIn = active.filter((ps) => !ps.isAllIn);
  return active.length <= 1 || notAllIn.length <= 1;
}

export function getNextPhase(phase: GamePhase): GamePhase {
  const progression: Record<GamePhase, GamePhase> = {
    idle: 'preflop',
    preflop: 'flop',
    flop: 'turn',
    turn: 'river',
    river: 'showdown',
    showdown: 'idle',
    ended: 'idle',
  };
  return progression[phase];
}

export function resetRoundState(state: GameState): GameState {
  const newStates: Record<string, PlayerState> = {};
  for (const [userId, ps] of Object.entries(state.playerStates)) {
    newStates[userId] = {
      ...ps,
      currentBet: 0,
      totalBetThisRound: 0,
      hasBettedThisRound: false,
    };
  }
  return { ...state, currentBet: 0, playerStates: newStates };
}

export function applyAction(
  state: GameState,
  userId: string,
  action: PlayerAction,
  raiseAmount?: number
): GameState {
  const ps = { ...state.playerStates[userId] };
  let pot = state.pot;
  let currentBet = state.currentBet;
  const newStates = { ...state.playerStates };

  switch (action) {
    case 'fold': {
      ps.isFolded = true;
      ps.hasBettedThisRound = true;
      break;
    }
    case 'check': {
      ps.hasBettedThisRound = true;
      break;
    }
    case 'call': {
      const callAmount = Math.min(currentBet - ps.currentBet, ps.chips);
      ps.chips -= callAmount;
      pot += callAmount;
      ps.currentBet += callAmount;
      ps.totalBetThisRound += callAmount;
      ps.hasBettedThisRound = true;
      ps.isAllIn = ps.chips === 0;
      break;
    }
    case 'raise': {
      const raise = raiseAmount ?? currentBet * 2;
      const additional = Math.min(raise - ps.currentBet, ps.chips);
      ps.chips -= additional;
      pot += additional;
      ps.currentBet += additional;
      ps.totalBetThisRound += additional;
      currentBet = ps.currentBet;
      ps.hasBettedThisRound = true;
      ps.isAllIn = ps.chips === 0;
      // Reset others' hasBettedThisRound so they must act again
      for (const [uid, other] of Object.entries(newStates)) {
        if (uid !== userId && !other.isFolded && !other.isAllIn) {
          newStates[uid] = { ...other, hasBettedThisRound: false };
        }
      }
      break;
    }
    case 'all_in': {
      const allInAmount = ps.chips;
      pot += allInAmount;
      ps.currentBet += allInAmount;
      ps.totalBetThisRound += allInAmount;
      if (ps.currentBet > currentBet) {
        currentBet = ps.currentBet;
        for (const [uid, other] of Object.entries(newStates)) {
          if (uid !== userId && !other.isFolded && !other.isAllIn) {
            newStates[uid] = { ...other, hasBettedThisRound: false };
          }
        }
      }
      ps.chips = 0;
      ps.isAllIn = true;
      ps.hasBettedThisRound = true;
      break;
    }
  }

  newStates[userId] = ps;
  const nextPlayer = getNextToAct({ ...state, playerStates: newStates, currentBet, currentPlayerUserId: userId });

  return {
    ...state,
    pot,
    currentBet,
    playerStates: newStates,
    currentPlayerUserId: nextPlayer,
    updatedAt: new Date().toISOString(),
  };
}

export function computeAwards(
  state: GameState,
  winnerUserIds: string[]
): Record<string, number> {
  const awards: Record<string, number> = {};
  for (const uid of winnerUserIds) awards[uid] = 0;

  const activePlayers = Object.values(state.playerStates).filter(
    (ps) => !ps.isFolded
  );

  // Sort by totalBetThisRound ascending to compute side pots
  const sorted = [...activePlayers].sort(
    (a, b) => a.totalBetThisRound - b.totalBetThisRound
  );

  let remainingPot = state.pot;
  let prevThreshold = 0;

  for (const player of sorted) {
    const threshold = player.totalBetThisRound;
    if (threshold <= prevThreshold) continue;

    const eligibleWinners = winnerUserIds.filter((uid) => {
      const ps = state.playerStates[uid];
      return ps && !ps.isFolded && ps.totalBetThisRound >= threshold;
    });

    if (eligibleWinners.length === 0) continue;

    const sidePotContributors = activePlayers.filter(
      (ps) => ps.totalBetThisRound >= threshold
    ).length;
    const sidePot = Math.min(
      (threshold - prevThreshold) * sidePotContributors,
      remainingPot
    );

    const share = Math.floor(sidePot / eligibleWinners.length);
    for (const uid of eligibleWinners) {
      awards[uid] = (awards[uid] ?? 0) + share;
    }

    remainingPot -= sidePot;
    prevThreshold = threshold;
  }

  // Any remainder (rounding) goes to first winner
  if (remainingPot > 0 && winnerUserIds.length > 0) {
    awards[winnerUserIds[0]] = (awards[winnerUserIds[0]] ?? 0) + remainingPot;
  }

  return awards;
}

export function computeFinalChips(
  state: GameState,
  awards: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [userId, ps] of Object.entries(state.playerStates)) {
    result[userId] = ps.chips + (awards[userId] ?? 0);
  }
  return result;
}

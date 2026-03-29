export type GamePhase =
  | 'idle'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'ended';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export interface PlayerState {
  userId: string;
  chips: number;
  currentBet: number;
  totalBetThisRound: number;
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  hasBettedThisRound: boolean;
}

export interface GameState {
  id: string;
  roomId: string;
  handNumber: number;
  phase: GamePhase;
  pot: number;
  currentBet: number;
  dealerIndex: number;
  currentPlayerUserId: string | null;
  playerOrder: string[];
  playerStates: Record<string, PlayerState>;
  smallBlind: number;
  bigBlind: number;
  updatedAt: string;
}

export type SocialEventType = 'reaction' | 'poke' | 'quicktalk' | 'tip';

export interface SocialEvent {
  id: string;
  roomId: string;
  fromUserId: string;
  toUserId: string | null;
  type: SocialEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  hostUserId: string;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  createdAt: string;
}

export interface Player {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  chips: number;
  totalBuyin: number;
  winStreak: number;
  isActive: boolean;
  isReady: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface ChipAction {
  id: string;
  roomId: string;
  playerId: string;
  userId: string;
  amount: number;
  chipsBefore: number;
  chipsAfter: number;
  createdAt: string;
}

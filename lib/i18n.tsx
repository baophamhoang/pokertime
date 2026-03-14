'use client';

import { createContext, useContext } from 'react';

const strings = {
  // Auth
  signIn: 'Sign in with Google',
  signOut: 'Sign out',
  signedInAs: 'Signed in as',
  chooseDisplayName: 'Choose your display name',
  displayNameHint: "This is how other players will see you at the table.",
  letsPlay: "Let's play",

  // Home
  homeTitle: 'Poker Night, Online',
  homeSubtitle: 'Real-time chip tracking for your home game. Sign in to create or join a room.',
  createRoom: 'Create Room',
  joinRoom: 'Join Room',
  startingChips: 'Starting Chips',
  smallBlind: 'Small Blind',
  bigBlind: 'Big Blind',
  roomCode: 'Room Code',
  creating: 'Creating…',
  joining: 'Joining…',
  roomNotFound: 'Room not found. Check your code and try again.',

  // Lobby
  players: 'Players',
  ready: 'Ready',
  notReady: 'Not Ready',
  readyUp: 'Ready Up',
  startGame: 'Start Game',
  copyInviteLink: 'Copy invite link',
  you: '(you)',
  host: 'host',
  blinds: 'Blinds',
  starting: 'Starting',
  chips: 'chips',

  // Game
  yourTurn: 'Your Turn',
  fold: 'Fold',
  check: 'Check',
  call: 'Call',
  raise: 'Raise',
  allIn: 'All In',
  raiseTo: 'Raise to',
  pot: 'Pot',
  currentBet: 'Current bet',
  nextPhase: 'Next Phase →',
  awardPot: 'Award Pot',
  nextHand: 'Next Hand',
  hand: 'Hand',
  waiting: 'Waiting',
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  ended: 'Ended',
  allInLabel: 'ALL IN',
  selectWinners: 'Select winner(s) to split the pot',
  cancel: 'Cancel',
  award: 'Award',
} as const;

type Strings = typeof strings;

const I18nContext = createContext<Strings>(strings);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nContext.Provider value={strings}>{children}</I18nContext.Provider>;
}

export function useI18n(): Strings {
  return useContext(I18nContext);
}

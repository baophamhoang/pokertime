-- ============================================================
-- PokerTime – Database Schema
-- Extended from chips-tracker; run in Supabase SQL editor
-- ============================================================

-- ============================================================
-- Rooms table
-- ============================================================

CREATE TABLE IF NOT EXISTS rooms (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code            text        UNIQUE NOT NULL,              -- 6-char join code, e.g. "ABC123"
  host_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_chips  integer     NOT NULL DEFAULT 1000,
  small_blind     integer     NOT NULL DEFAULT 10,
  big_blind       integer     NOT NULL DEFAULT 20,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Players table (one row per user per room)
-- ============================================================

CREATE TABLE IF NOT EXISTS players (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id         uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- denormalized display fields (snapshot from auth.users at join time)
  username        text        NOT NULL,                     -- nickname chosen by user
  avatar_url      text,                                     -- Google profile pic URL or custom upload
  chips           integer     NOT NULL DEFAULT 1000,
  total_buyin     integer     NOT NULL DEFAULT 1000,
  win_streak      integer     NOT NULL DEFAULT 0,           -- consecutive hand wins
  is_active       boolean     NOT NULL DEFAULT true,
  is_ready        boolean     NOT NULL DEFAULT false,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_players_room_active
  ON players (room_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_players_last_seen_active
  ON players (last_seen_at) WHERE is_active = true;

-- ============================================================
-- Chip actions table (tracks history for undo)
-- ============================================================

CREATE TABLE IF NOT EXISTS chip_actions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id         uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id       uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          integer     NOT NULL,
  chips_before    integer     NOT NULL,
  chips_after     integer     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Games table – one active game per room
-- ============================================================

CREATE TABLE IF NOT EXISTS games (
  id                      uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id                 uuid    NOT NULL REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,

  -- Hand progression
  hand_number             integer NOT NULL DEFAULT 0,
  phase                   text    NOT NULL DEFAULT 'idle',
  -- phase values: 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended'

  -- Pot and current bet for this betting round
  pot                     integer NOT NULL DEFAULT 0,
  current_bet             integer NOT NULL DEFAULT 0,

  -- Seat tracking
  dealer_index            integer NOT NULL DEFAULT 0,
  current_player_user_id  uuid,  -- null outside betting rounds
  player_order            uuid[]  NOT NULL DEFAULT '{}',
  -- Ordered array of user_ids for this hand

  -- Per-player state for the current hand, keyed by user_id (string keys in JSONB)
  player_states           jsonb   NOT NULL DEFAULT '{}',
  -- { [userId: string]: PlayerGameState }

  -- Blind levels (editable between hands)
  small_blind             integer NOT NULL DEFAULT 10,
  big_blind               integer NOT NULL DEFAULT 20,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Social events table (ephemeral – reactions, pokes, quick-talk)
-- TTL: rows older than 30 seconds should be ignored client-side
-- or cleaned up by a scheduled function
-- ============================================================

CREATE TABLE IF NOT EXISTS social_events (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id         uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  -- null = broadcast to all players in room

  type            text        NOT NULL,
  -- 'reaction'   → floating emoji from sender seat
  -- 'poke'       → projectile thrown at a specific player
  -- 'quicktalk'  → pre-defined speech bubble from sender
  -- 'tip'        → dealer tip (chips from player → dealer)

  payload         jsonb       NOT NULL DEFAULT '{}',
  -- reaction: { emoji: string }
  -- poke:     { item: 'tomato' | 'chip' | 'heart' | string }
  -- quicktalk:{ message: string }
  -- tip:      { amount: number }

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_events_room_created
  ON social_events (room_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chip_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE games         ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_events ENABLE ROW LEVEL SECURITY;

-- MVP policy: allow all authenticated users
-- Tighten per-room policies post-v1

CREATE POLICY "rooms: allow all authenticated"
  ON rooms FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "players: allow all authenticated"
  ON players FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "chip_actions: allow all authenticated"
  ON chip_actions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "games: allow all authenticated"
  ON games FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "social_events: allow all authenticated"
  ON social_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- Realtime publications
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE social_events;

-- ============================================================
-- Cleanup functions (called via pg_cron or Supabase cron)
-- ============================================================

-- 1. Soft-delete players not seen in 24+ hours
CREATE OR REPLACE FUNCTION cleanup_inactive_players()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected integer;
BEGIN
  UPDATE players
    SET is_active = false
    WHERE is_active = true
      AND last_seen_at < now() - interval '24 hours';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 2. Hard-delete stale rooms (cascade removes players, games, chip_actions, social_events)
CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected integer;
BEGIN
  DELETE FROM rooms
  WHERE created_at < now() - interval '24 hours'
    AND id IN (
      SELECT r.id FROM rooms r
      LEFT JOIN games g ON g.room_id = r.id
      WHERE g.id IS NULL
         OR g.updated_at < now() - interval '24 hours'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 3. Purge social events older than 60 seconds (ephemeral by design)
CREATE OR REPLACE FUNCTION cleanup_old_social_events()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected integer;
BEGIN
  DELETE FROM social_events
    WHERE created_at < now() - interval '60 seconds';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ============================================================
-- Helpful views
-- ============================================================

-- Active players per room with their current hand state
CREATE OR REPLACE VIEW active_players_with_stats AS
SELECT
  p.id,
  p.room_id,
  p.user_id,
  p.username,
  p.avatar_url,
  p.chips,
  p.total_buyin,
  p.win_streak,
  p.chips - p.total_buyin AS net_chips,
  p.is_active,
  p.is_ready,
  p.joined_at,
  p.last_seen_at
FROM players p
WHERE p.is_active = true;

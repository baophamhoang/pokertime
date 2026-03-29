# PokerTime

A real-time, mobile-first Texas Hold'em companion app for friend groups. Combines a full poker engine with a social layer — animated showdowns, emoji reactions, projectile throws, dealer tipping, and win streak tracking.

## Stack

| Technology | Role |
|---|---|
| Next.js 16 (App Router) | Framework — server components for room validation, client components for realtime |
| React 19 | UI — concurrent features for smooth realtime updates |
| Supabase | Auth (Google OAuth) + Postgres (game state) + Realtime (change feeds) |
| Tailwind CSS 4 | Styling |
| Framer Motion | Animations — showdown reveal, chip slides, projectile throws |
| Howler.js | Sound effects |

## Architecture

```
Browser                         Supabase
┌─────────────────────────┐     ┌──────────────────────────────┐
│  Next.js App (Client)   │     │  Auth (Google OAuth)         │
│                         │◄───►│  Postgres (game state)       │
│  useGame / useSocial    │     │  Realtime (change feeds)     │
│  (subscriptions)        │     │  Edge Functions (TTL cleanup) │
└─────────────────────────┘     └──────────────────────────────┘
         │
         │ Server Components
         ▼
┌─────────────────────────┐
│  Next.js Server         │
│  - Room validation      │
│  - Initial data fetch   │
│  - Auth session read    │
└─────────────────────────┘
```

**Data flow for a player action:**
1. Player clicks an action (Raise, Call, Fold, etc.)
2. `useGame.ts` calls `applyAction()` from `engine.ts` — pure, local, synchronous
3. Result is written to the `games` table via `api.ts`
4. Supabase Realtime broadcasts `postgres_changes` to all room subscribers
5. All clients re-render from the canonical DB state

The game engine (`features/game/engine.ts`) is pure functional with no I/O. All side effects are isolated in `api.ts`.

## Database Schema

Five tables, all with Row-Level Security enabled:

- **`rooms`** — room config (join code, host, blinds, starting chips)
- **`players`** — one row per user per room; tracks chips, win streak, ready state
- **`chip_actions`** — immutable log of buy-ins and cashouts
- **`games`** — single active game per room; JSONB `player_states` keyed by `user_id`
- **`social_events`** — ephemeral reactions/pokes/quicktalk; TTL 60 seconds, cleaned by a Postgres function

Realtime is enabled on `players`, `games`, and `social_events`.

## Key Features

- **Full Texas Hold'em engine** — blinds, betting rounds, side pots, all-in handling, heads-up rule
- **Animated showdown** — staggered card flips, winner spotlight, confetti, chip slide to winner
- **Social layer** — emoji reactions (float upward), projectile throws (parabolic arc), quick-talk speech bubbles
- **Dealer tipping** — chip animates from player seat to dealer seat with sound
- **Win streak badge** — pulsing fire icon for consecutive wins
- **Sound effects** — chip shuffle, card flip, win jingle, fold whoosh, chip slide (Howler.js, mute persisted to localStorage)
- **Google SSO** — profile pic and display name pre-populate player data
- **Crash recovery** — room code in localStorage, upsert-on-rejoin, automatic Realtime reconnect

## Folder Structure

```
pokertime/
├── app/
│   ├── page.tsx                  # Home: create room / join by code
│   ├── layout.tsx
│   ├── providers.tsx             # Auth, theme, i18n providers
│   └── r/[roomCode]/
│       ├── page.tsx              # Server component: validates room, fetches initial state
│       └── RoomPageClient.tsx    # Client component: realtime subscriptions, game UI
│
├── features/
│   ├── auth/                     # SignInButton, UserMenu, useAuth hook
│   ├── game/                     # engine.ts (pure), api.ts, types.ts, useGame hook
│   ├── player/                   # Player CRUD (join, heartbeat, leave)
│   ├── room/                     # Room creation, code generation, host controls
│   ├── chips/                    # Buy-in / cashout log
│   ├── social/                   # ReactionBar, ThrowProjectile, QuickTalk, WinStreak, useSocial hook
│   └── animations/               # ShowdownReveal, DealerTip, Confetti
│
├── lib/
│   ├── supabase.ts               # Browser + server client singletons
│   ├── sounds.ts                 # Howler.js sound manager
│   ├── theme.tsx                 # Dark/light theme context
│   └── i18n.tsx                  # Internationalisation strings
│
└── supabase/
    ├── schema.sql                # Full DB schema
    └── migrations/
```

## Auth Flow

1. Sign in with Google via `supabase.auth.signInWithOAuth`
2. Callback at `/auth/callback` exchanges code for session
3. On first login, a nickname modal pre-fills from Google profile name
4. Joining a room upserts on `(room_id, user_id)` — no duplicates on rejoin
5. Game actions go through Next.js Server Actions; the server verifies `current_player_user_id === session.user.id` before writing with the service-role client (prevents spoofing)

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never expose to client
```

### Database Setup

Run `supabase/schema.sql` against a new Supabase project, then:

- Enable the `moddatetime` extension (`CREATE EXTENSION IF NOT EXISTS moddatetime`)
- Enable Realtime for `players`, `games`, `social_events` in the Supabase dashboard
- Configure Google OAuth in Supabase Auth; set redirect URL to `<your-domain>/auth/callback`

## Docs

- [`docs/product-brief.md`](docs/product-brief.md) — problem, users, business model, success metrics
- [`docs/tech-spec.md`](docs/tech-spec.md) — full technical specification (API contracts, engine functions, animation details, realtime strategy)
- [`docs/schema.sql`](docs/schema.sql) — canonical database schema
- [`docs/implementation-plan.md`](docs/implementation-plan.md) — phased implementation checklist with skill references

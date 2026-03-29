'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase';

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    user.email?.split('@')[0] ??
    'Player';

  async function handleSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-white/10 transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-white hidden sm:block">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-gray-800 border border-white/10 shadow-xl z-50">
          <div className="p-3 border-b border-white/10">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors rounded-b-xl"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

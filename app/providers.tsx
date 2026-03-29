'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase';

interface NicknameModalProps {
  user: User;
  onDone: () => void;
}

function NicknameModal({ user, onDone }: NicknameModalProps) {
  const defaultName =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    '';
  const [nickname, setNickname] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!nickname.trim()) return;
    setSaving(true);
    // Just store the nickname preference — actual player row created on room join
    localStorage.setItem('poker_nickname', nickname.trim());
    onDone();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">Choose your display name</h2>
        <p className="text-sm text-gray-400 mb-4">This is how other players will see you at the table.</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          maxLength={24}
          className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-4 py-2.5 focus:outline-none focus:border-emerald-500 mb-4"
          autoFocus
        />
        <button
          onClick={handleConfirm}
          disabled={saving || !nickname.trim()}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 transition-colors"
        >
          {saving ? 'Saving…' : 'Let\'s play'}
        </button>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const supabase = supabaseBrowser();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u && !localStorage.getItem('poker_nickname')) {
        setShowNicknameModal(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === 'SIGNED_IN' && u && !localStorage.getItem('poker_nickname')) {
        setShowNicknameModal(true);
      }
      if (event === 'SIGNED_OUT') {
        setShowNicknameModal(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      {children}
      {showNicknameModal && user && (
        <NicknameModal user={user} onDone={() => setShowNicknameModal(false)} />
      )}
    </>
  );
}

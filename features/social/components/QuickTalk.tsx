'use client';

import { useState } from 'react';

const PHRASES = [
  'Nice hand!',
  'Lucky!',
  'Good game!',
  'All in!',
  'I call!',
  "Don't bluff me.",
  'Raise!',
  'Come on!',
];

interface QuickTalkProps {
  onSend: (phrase: string) => void;
}

export function QuickTalk({ onSend }: QuickTalkProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-1.5 transition-colors"
      >
        💬 Talk
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 bg-gray-800 border border-white/10 rounded-xl p-2 w-48 z-40 shadow-xl">
          {PHRASES.map((phrase) => (
            <button
              key={phrase}
              onClick={() => { onSend(phrase); setOpen(false); }}
              className="w-full text-left text-sm px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-200"
            >
              {phrase}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import type { SocialEvent } from '@/features/game/types';

export function useSocial(roomId: string, fromUserId: string) {
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const supabase = useRef(supabaseBrowser());

  useEffect(() => {
    const channel = supabase.current
      .channel(`social:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_events', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const event: SocialEvent = {
            id: row.id as string,
            roomId: row.room_id as string,
            fromUserId: row.from_user_id as string,
            toUserId: (row.to_user_id as string) ?? null,
            type: row.type as SocialEvent['type'],
            payload: (row.payload as Record<string, unknown>) ?? {},
            createdAt: row.created_at as string,
          };
          addEvent(event);
        }
      )
      .subscribe();

    return () => { supabase.current.removeChannel(channel); };
  }, [roomId]);

  function addEvent(event: SocialEvent) {
    setEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev, event];
    });
    // Auto-remove after 30s
    setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    }, 30_000);
  }

  async function sendEvent(
    type: SocialEvent['type'],
    payload: Record<string, unknown>,
    toUserId?: string
  ) {
    const optimisticEvent: SocialEvent = {
      id: crypto.randomUUID(),
      roomId,
      fromUserId,
      toUserId: toUserId ?? null,
      type,
      payload,
      createdAt: new Date().toISOString(),
    };
    addEvent(optimisticEvent);

    await supabase.current.from('social_events').insert({
      room_id: roomId,
      from_user_id: fromUserId,
      to_user_id: toUserId ?? null,
      type,
      payload,
    });
  }

  return {
    events,
    sendReaction: (emoji: string, toUserId?: string) =>
      sendEvent('reaction', { emoji }, toUserId),
    sendPoke: (toUserId: string, item = 'chip') =>
      sendEvent('poke', { item }, toUserId),
    sendQuickTalk: (message: string) =>
      sendEvent('quicktalk', { message }),
    sendTip: (toUserId: string, amount: number) =>
      sendEvent('tip', { amount }, toUserId),
  };
}

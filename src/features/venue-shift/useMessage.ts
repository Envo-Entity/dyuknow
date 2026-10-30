import { router } from 'expo-router';
import { useCallback } from 'react';

import { openConversation, useLive } from '@/data';

/**
 * Open-thread (spec §7.3): open the conversation with this person, starting
 * one first when there isn't one yet.
 */
export function useMessage() {
  const { data, me, run } = useLive();
  return useCallback(
    async (otherId: string) => {
      if (!data || !me) return;
      const existing = data.threads.find((t) =>
        me.side === 'venue' ? t.venue === me.id && t.talent === otherId : t.talent === me.id && t.venue === otherId,
      );
      if (existing) {
        router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
        return;
      }
      const r = await run(`open:${otherId}`, () => openConversation(otherId));
      if (r) router.push({ pathname: '/chat/[id]', params: { id: r.conversation_id } });
    },
    [data, me, run],
  );
}

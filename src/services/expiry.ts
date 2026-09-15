import { db, C } from './firebase';
import { APP } from '../config/credentials';

/**
 * Client-side 30-day expiry sweep.
 * Runs once on app start (background tasks not implemented).
 * Deletes message docs whose recipient never fetched them for 30 days.
 */
export const ExpiryService = {
  sweep: async () => {
    const cutoff = Date.now() - APP.offlineExpiryDays * 24 * 60 * 60 * 1000;

    // Scan all message threads (small app, so ok)
    const threads = await db.collection(C.messages).get();
    for (const thread of threads.docs) {
      const sub = await thread.ref.collection('thread').get();
      for (const m of sub.docs) {
        const d = m.data();
        const old = d.createdAt && d.createdAt < cutoff;
        const undelivered = d.status === 'sent';
        if (old && undelivered) {
          try {
            await m.ref.delete();
          } catch {}
        }
      }
    }
  },

  /**
   * Sweep stale call_logs too (older than 90 days).
   */
  sweepCalls: async () => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const snap = await db
      .collection('call_logs')
      .where('at', '<', cutoff)
      .get();
    for (const d of snap.docs) {
      try {
        await d.ref.delete();
      } catch {}
    }
  },
};

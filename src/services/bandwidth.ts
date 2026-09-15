import { db } from './firebase';
import { APP } from '../config/credentials';

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const BandwidthService = {
  /**
   * Add used MB to this month's counter.
   */
  add: async (mb: number) => {
    const key = monthKey();
    const ref = db.collection('bandwidth').doc(key);
    const snap = await ref.get();
    const cur = snap.exists ? snap.data()?.usedMB || 0 : 0;
    const next = cur + mb;
    await ref.set(
      { usedMB: next, updatedAt: Date.now(), resetDay: APP.bandwidthResetDay },
      { merge: true }
    );
    return next;
  },

  /**
   * Current used MB in this month.
   */
  current: async (): Promise<number> => {
    const key = monthKey();
    const snap = await db.collection('bandwidth').doc(key).get();
    return snap.exists ? snap.data()?.usedMB || 0 : 0;
  },

  /**
   * Can we still upload media?
   */
  canUpload: async (sizeMB: number): Promise<boolean> => {
    const used = await BandwidthService.current();
    return used + sizeMB <= APP.maxBandwidthMB;
  },

  /**
   * Delete old month counters (older than 3 months) — housekeeping.
   */
  cleanupOld: async () => {
    const now = new Date();
    for (let i = 3; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      try {
        await db.collection('bandwidth').doc(key).delete();
      } catch {}
    }
  },
};

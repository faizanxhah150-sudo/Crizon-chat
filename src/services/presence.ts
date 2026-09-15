import { rtdb } from './firebase';

export const PresenceService = {
  setOnline: async (uid: string) => {
    await rtdb.ref(`presence/${uid}`).update({
      online: true,
      lastSeen: Date.now(),
    });
  },

  setOffline: async (uid: string) => {
    await rtdb.ref(`presence/${uid}`).update({
      online: false,
      lastSeen: Date.now(),
    });
  },

  watch: (uid: string, cb: (online: boolean, lastSeen: number) => void) => {
    const ref = rtdb.ref(`presence/${uid}`);
    const listener = ref.on('value', (snap) => {
      const v = snap.val() || {};
      cb(!!v.online, v.lastSeen || 0);
    });
    return () => ref.off('value', listener);
  },
};

import { db, C } from './firebase';

export const BlockedService = {
  isBlocked: async (myUid: string, otherUsername: string): Promise<boolean> => {
    const me = await db.collection(C.users).doc(myUid).get();
    const data = me.data() || {};
    const blocked: string[] = data.blocked || [];
    return blocked.includes(otherUsername);
  },

  block: async (myUid: string, otherUsername: string) => {
    const me = await db.collection(C.users).doc(myUid).get();
    const data = me.data() || {};
    const blocked: string[] = data.blocked || [];
    if (!blocked.includes(otherUsername)) {
      blocked.push(otherUsername);
      await db.collection(C.users).doc(myUid).update({ blocked });
    }
  },

  unblock: async (myUid: string, otherUsername: string) => {
    const me = await db.collection(C.users).doc(myUid).get();
    const data = me.data() || {};
    const blocked: string[] = (data.blocked || []).filter(
      (u: string) => u !== otherUsername
    );
    await db.collection(C.users).doc(myUid).update({ blocked });
  },
};

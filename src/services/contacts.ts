import { db, C } from './firebase';

export type Contact = {
  uid: string;
  username: string;
  name: string;
  profileUrl: string;
};

export const ContactsService = {
  /**
   * Fetch all added contacts of a user (from users/{uid}.contacts array)
   */
  getMyContacts: async (uid: string): Promise<Contact[]> => {
    const me = await db.collection(C.users).doc(uid).get();
    if (!me.exists) return [];
    const data = me.data() || {};
    const usernames: string[] = data.contacts || [];
    if (usernames.length === 0) return [];

    // Fetch each user by username (chunks of 10 for Firestore "in" limit)
    const result: Contact[] = [];
    const chunks: string[][] = [];
    for (let i = 0; i < usernames.length; i += 10) {
      chunks.push(usernames.slice(i, i + 10));
    }
    for (const chunk of chunks) {
      const snap = await db
        .collection(C.users)
        .where('username', 'in', chunk)
        .get();
      snap.forEach((doc) => {
        const d = doc.data();
        result.push({
          uid: doc.id,
          username: d.username,
          name: d.name,
          profileUrl: d.profileUrl || '',
        });
      });
    }
    return result;
  },

  /**
   * Search a user by username (e.g. abdullah@crizon)
   */
  searchByUsername: async (username: string): Promise<Contact | null> => {
    const clean = username.trim().toLowerCase();
    const full = clean.endsWith('@crizon') ? clean : `${clean}@crizon`;
    const snap = await db
      .collection(C.users)
      .where('username', '==', full)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const d = doc.data();
    return {
      uid: doc.id,
      username: d.username,
      name: d.name,
      profileUrl: d.profileUrl || '',
    };
  },

  /**
   * Add a username to my contacts array
   */
  addContact: async (myUid: string, username: string) => {
    const me = await db.collection(C.users).doc(myUid).get();
    const data = me.data() || {};
    const contacts: string[] = data.contacts || [];
    if (!contacts.includes(username)) {
      contacts.push(username);
      await db.collection(C.users).doc(myUid).update({ contacts });
    }
  },

  /**
   * Remove from contacts
   */
  removeContact: async (myUid: string, username: string) => {
    const me = await db.collection(C.users).doc(myUid).get();
    const data = me.data() || {};
    const contacts: string[] = (data.contacts || []).filter(
      (c: string) => c !== username
    );
    await db.collection(C.users).doc(myUid).update({ contacts });
  },
};

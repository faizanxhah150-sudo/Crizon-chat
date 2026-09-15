import { auth, db, rtdb, C } from './firebase';
import { Session, SessionData } from './session';
import { APP } from '../config/credentials';
import DeviceInfo from 'react-native-device-info';
import uuid from 'react-native-uuid';

// Synthetic email since we don't use phone/email
const toEmail = (username: string) => `${username.replace(/[^a-z0-9]/g, '')}@crizon.app`;

export const AuthService = {
  /**
   * Create account.
   * username: user ne jo likha — spaces remove, lowercase, @crizon suffix
   */
  signUp: async (name: string, username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername) throw new Error('Username khali hai');
    if (!name.trim()) throw new Error('Naam khali hai');
    if (password.length < 4) throw new Error('Password chhota hai');

    const fullUsername = `${cleanUsername}${APP.usernameSuffix}`; // faizan@crizon
    const email = toEmail(fullUsername);

    // Check duplicate username
    const dup = await db
      .collection(C.users)
      .where('username', '==', fullUsername)
      .limit(1)
      .get();
    if (!dup.empty) throw new Error('Ye username pehle se maujood hai');

    // Firebase Auth create
    const cred = await auth().createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // Save user in Firestore
    await db.collection(C.users).doc(uid).set({
      uid,
      name: name.trim(),
      username: fullUsername,
      createdAt: Date.now(),
      contacts: [],
      blocked: [],
      profileUrl: '',
    });

    // RTDB presence stub
    await rtdb.ref(`presence/${uid}`).set({ online: false, lastSeen: Date.now() });

    // Login session
    return await AuthService._createSession(uid, name.trim(), fullUsername);
  },

  signIn: async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    const fullUsername = cleanUsername.endsWith(APP.usernameSuffix)
      ? cleanUsername
      : `${cleanUsername}${APP.usernameSuffix}`;
    const email = toEmail(fullUsername);

    const cred = await auth().signInWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    const userDoc = await db.collection(C.users).doc(uid).get();
    if (!userDoc.exists) throw new Error('User record nahi mila');
    const data = userDoc.data() || {};

    return await AuthService._createSession(uid, data.name || '', data.username || fullUsername);
  },

  signOut: async () => {
    const s = await Session.load();
    if (s) {
      try {
        await rtdb.ref(`presence/${s.uid}`).update({ online: false, lastSeen: Date.now() });
        await db.collection(C.sessions).doc(s.uid).delete();
      } catch {}
    }
    await Session.clear();
    await auth().signOut();
  },

  _createSession: async (uid: string, name: string, username: string): Promise<SessionData> => {
    const deviceId = await DeviceInfo.getUniqueId();
    const sessionToken = String(uuid.v4());

    // SINGLE SESSION: overwrite any existing session for this uid
    await db.collection(C.sessions).doc(uid).set({
      deviceId,
      sessionToken,
      updatedAt: Date.now(),
    });

    const sessionData: SessionData = { uid, name, username, deviceId, sessionToken };
    await Session.save(sessionData);

    // RTDB presence online
    await rtdb.ref(`presence/${uid}`).update({ online: true, lastSeen: Date.now() });

    return sessionData;
  },

  /**
   * Single-session enforcement.
   * Call on app foreground / periodically.
   * If server sessionToken !== local token -> force logout.
   */
  checkSingleSession: async (): Promise<boolean> => {
    const local = await Session.load();
    if (!local) return false;

    const snap = await db.collection(C.sessions).doc(local.uid).get();
    if (!snap.exists) return true;
    const server = snap.data() || {};
    return server.sessionToken === local.sessionToken;
  },
};

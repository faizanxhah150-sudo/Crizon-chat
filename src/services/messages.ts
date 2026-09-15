import { db, C } from './firebase';
import firestore from '@react-native-firebase/firestore';

export type MsgType = 'text' | 'image' | 'video' | 'audio' | 'file';

export type Message = {
  id: string;
  from: string;
  to: string;
  type: MsgType;
  content?: string;
  url?: string;
  cloudinaryId?: string;
  size?: number;
  duration?: number;
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
};

const key = (a: string, b: string) => [a, b].sort().join('__');

export const MessagesService = {
  /**
   * Send a message. Chat id is deterministic from both usernames
   * so both sides read the same thread.
   */
  send: async (from: string, to: string, payload: Partial<Message>) => {
    const chatId = key(from, to);
    const ref = await db
      .collection(C.messages)
      .doc(chatId)
      .collection('thread')
      .add({
        from,
        to,
        type: payload.type || 'text',
        content: payload.content || '',
        url: payload.url || '',
        cloudinaryId: payload.cloudinaryId || '',
        size: payload.size || 0,
        duration: payload.duration || 0,
        createdAt: Date.now(),
        status: 'sent',
      });
    return ref.id;
  },

  /**
   * Subscribe to a thread between two users. Returns unsub function.
   */
  subscribe: (
    a: string,
    b: string,
    cb: (msgs: Message[]) => void
  ) => {
    const chatId = key(a, b);
    return db
      .collection(C.messages)
      .doc(chatId)
      .collection('thread')
      .orderBy('createdAt', 'asc')
      .onSnapshot((snap) => {
        const out: Message[] = [];
        snap.forEach((d) => {
          const data = d.data();
          out.push({
            id: d.id,
            from: data.from,
            to: data.to,
            type: data.type,
            content: data.content,
            url: data.url,
            cloudinaryId: data.cloudinaryId,
            size: data.size,
            duration: data.duration,
            createdAt: data.createdAt,
            status: data.status,
          });
        });
        cb(out);
      });
  },

  /**
   * Mark all messages in a thread as read (blue ticks)
   */
  markRead: async (a: string, b: string, reader: string) => {
    const chatId = key(a, b);
    const snap = await db
      .collection(C.messages)
      .doc(chatId)
      .collection('thread')
      .where('to', '==', reader)
      .where('status', '!=', 'read')
      .get();
    const batch = firestore().batch();
    snap.forEach((d) => batch.update(d.ref, { status: 'read' }));
    await batch.commit();
  },

  /**
   * Clear all messages in thread (both sides)
   */
  clearThread: async (a: string, b: string) => {
    const chatId = key(a, b);
    const snap = await db
      .collection(C.messages)
      .doc(chatId)
      .collection('thread')
      .get();
    const batch = firestore().batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};

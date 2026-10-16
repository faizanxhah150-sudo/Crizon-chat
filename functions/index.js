/**
 * Crizon Cloud Functions
 *
 * 1. onNewMessage — fires the instant a message doc is created under
 *    messages/{cid}/thread/{messageId}. Looks up the recipient's saved FCM
 *    token and sends them a real push notification (title = sender's name,
 *    body = text preview or "📷 Photo" / "🎤 Voice message" / etc for media).
 *    This is what makes notifications arrive even when the app is closed —
 *    something no purely client-side code can do.
 *
 * 2. cleanupDeliveredMessages — runs on a schedule. The database's job is
 *    only to DELIVER a message; once the recipient has it (status: 'read',
 *    which the client already sets the moment they open that chat) it no
 *    longer needs to live in Firestore, since both devices keep their own
 *    permanent local copy (LocalCache / MediaStore in the app). This
 *    function is what actually removes it from the database, plus cleans
 *    up messages nobody ever came online to receive after 30 days, and
 *    messages a user explicitly deleted for everyone.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const logger = require('firebase-functions/logger');

initializeApp();
const db = getFirestore();

const OFFLINE_EXPIRY_DAYS = 30;
const DELIVERED_GRACE_MINUTES = 2; // small buffer so a client mid-render isn't yanked out from under it

function previewFor(msg) {
  switch (msg.type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'audio': return '🎤 Voice message';
    case 'file': return `📄 ${msg.fileName || 'Document'}`;
    default: return (msg.content || 'New message').slice(0, 120);
  }
}

exports.onNewMessage = onDocumentCreated('messages/{cid}/thread/{messageId}', async (event) => {
  const msg = event.data?.data();
  if (!msg || !msg.to || !msg.from) return;

  const [toSnap, fromSnap] = await Promise.all([
    db.collection('users').where('username', '==', msg.to).limit(1).get(),
    db.collection('users').where('username', '==', msg.from).limit(1).get(),
  ]);
  if (toSnap.empty) return;

  const toDoc = toSnap.docs[0];
  const toUser = toDoc.data();
  const fromUser = fromSnap.empty ? {} : fromSnap.docs[0].data();
  const token = toUser.fcmToken;
  if (!token) { logger.info('No fcmToken for recipient, skipping push', { to: msg.to }); return; }

  const payload = {
    token,
    notification: {
      title: fromUser.name || msg.from,
      body: previewFor(msg),
    },
    data: {
      fromUsername: msg.from,
      fromName: fromUser.name || msg.from,
      fromProfileUrl: fromUser.profileUrl || '',
    },
    android: {
      priority: 'high',
      notification: { channelId: 'messages' },
    },
  };

  try {
    await getMessaging().send(payload);
  } catch (e) {
    logger.error('FCM send failed', e);
    if (e && e.code === 'messaging/registration-token-not-registered') {
      await toDoc.ref.update({ fcmToken: null }).catch(() => {});
    }
  }
});

exports.cleanupDeliveredMessages = onSchedule('every 15 minutes', async () => {
  const now = Date.now();
  const graceMs = DELIVERED_GRACE_MINUTES * 60 * 1000;
  const expiryMs = OFFLINE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  // Delivered (recipient has opened the chat and locally has the data) —
  // safe to remove from the database now.
  const deliveredSnap = await db.collectionGroup('thread')
    .where('status', '==', 'read')
    .get();

  // Explicitly deleted "for everyone" — already hidden client-side via the
  // deletedForEveryone flag; this just frees the Firestore storage.
  const deletedSnap = await db.collectionGroup('thread')
    .where('deletedForEveryone', '==', true)
    .get();

  // Never delivered at all after 30 days — give up on it.
  const staleSnap = await db.collectionGroup('thread')
    .where('status', '==', 'sent')
    .get();

  let batch = db.batch();
  let opCount = 0;
  const commits = [];
  const queueDelete = (ref) => {
    batch.delete(ref);
    opCount++;
    if (opCount >= 450) { commits.push(batch.commit()); batch = db.batch(); opCount = 0; }
  };

  deliveredSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.createdAt && now - data.createdAt < graceMs) return; // just delivered, give the client a moment
    queueDelete(d.ref);
  });
  deletedSnap.docs.forEach((d) => queueDelete(d.ref));
  staleSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.createdAt && now - data.createdAt > expiryMs) queueDelete(d.ref);
  });

  if (opCount > 0) commits.push(batch.commit());
  await Promise.all(commits);
  logger.info(`Cleanup: delivered=${deliveredSnap.size} deletedForEveryone=${deletedSnap.size} staleChecked=${staleSnap.size}`);
});

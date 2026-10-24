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
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const logger = require('firebase-functions/logger');

initializeApp();
const db = getFirestore();

const OFFLINE_EXPIRY_DAYS = 30;
const DELIVERED_RETENTION_MINUTES = 15; // keep a delivered message briefly, then remove its Firestore copy

function previewFor(msg) {
  switch (msg.type) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'audio': return '🎤 Voice message';
    case 'file': return `📄 ${msg.fileName || 'Document'}`;
    default: return (msg.content || 'New message').slice(0, 120);
  }
}

exports.onNewMessage = onDocumentCreated({ document: 'messages/{cid}/thread/{messageId}', region: 'us-central1' }, async (event) => {
  const msg = event.data?.data();
  if (!msg || !msg.to || !msg.from) return;

  try {
    const [toSnap, fromSnap] = await Promise.all([
      db.collection('users').where('username', '==', msg.to).limit(1).get(),
      db.collection('users').where('username', '==', msg.from).limit(1).get(),
    ]);
    if (toSnap.empty) { logger.warn('Push skipped: recipient user not found', { to: msg.to }); return; }

    const toDoc = toSnap.docs[0];
    const toUser = toDoc.data();
    const fromUser = fromSnap.empty ? {} : fromSnap.docs[0].data();
    const tokens = [...new Set([...(Array.isArray(toUser.fcmTokens) ? toUser.fcmTokens : []), toUser.fcmToken].filter(t => typeof t === 'string' && t.trim()))];
    if (!tokens.length) { logger.info('No FCM token for recipient, skipping push', { to: msg.to }); return; }

    const message = {
      notification: { title: fromUser.name || msg.from, body: previewFor(msg) },
      data: {
        fromUsername: String(msg.from),
        fromName: String(fromUser.name || msg.from),
        fromProfileUrl: String(fromUser.profileUrl || ''),
      },
      android: { priority: 'high', notification: { channelId: 'messages', sound: 'default' } },
    };
    const result = await getMessaging().sendEachForMulticast({ ...message, tokens });
    const invalid = [];
    result.responses.forEach((r, i) => {
      if (!r.success) {
        logger.error('FCM send failed for recipient device', { to: msg.to, code: r.error?.code || 'unknown' });
        if (r.error?.code === 'messaging/registration-token-not-registered' || r.error?.code === 'messaging/invalid-registration-token') invalid.push(tokens[i]);
      }
    });
    if (invalid.length) {
      const remaining = tokens.filter(t => !invalid.includes(t));
      await toDoc.ref.update({ fcmTokens: remaining, ...(toUser.fcmToken && invalid.includes(toUser.fcmToken) ? { fcmToken: remaining[0] || null } : {}) }).catch(() => {});
    }
  } catch (e) {
    logger.error('onNewMessage failed', { message: e?.message || String(e), code: e?.code || 'unknown' });
  }
});

exports.cleanupDeliveredMessages = onSchedule({ schedule: 'every 5 minutes', region: 'us-central1' }, async () => {
  const now = Date.now();
  const retentionMs = DELIVERED_RETENTION_MINUTES * 60 * 1000;
  const expiryMs = OFFLINE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  // A recipient's client records deliveredAt/readAt when it has received the
  // message. The five-minute sweep means a delivered copy is removed at the
  // first sweep after its 15-minute retention window.
  const [readSnap, deliveredSnap, deletedSnap, staleSnap] = await Promise.all([
    db.collectionGroup('thread').where('status', '==', 'read').get(),
    db.collectionGroup('thread').where('status', '==', 'delivered').get(),
    db.collectionGroup('thread').where('deletedForEveryone', '==', true).get(),
    db.collectionGroup('thread').where('status', '==', 'sent').get(),
  ]);

  let batch = db.batch();
  let opCount = 0;
  const commits = [];
  const queuedPaths = new Set();
  const queueDelete = (ref) => {
    if (queuedPaths.has(ref.path)) return;
    queuedPaths.add(ref.path);
    batch.delete(ref);
    opCount++;
    if (opCount >= 450) { commits.push(batch.commit()); batch = db.batch(); opCount = 0; }
  };
  const deliveredSeen = new Set();
  const checkDelivered = (d) => {
    if (deliveredSeen.has(d.ref.path)) return;
    deliveredSeen.add(d.ref.path);
    const data = d.data();
    const deliveredAt = Number(data.deliveredAt || data.readAt || data.createdAt || 0);
    if (deliveredAt && now - deliveredAt >= retentionMs) queueDelete(d.ref);
  };
  readSnap.docs.forEach(checkDelivered);
  deliveredSnap.docs.forEach(checkDelivered);
  deletedSnap.docs.forEach(d => queueDelete(d.ref));
  staleSnap.docs.forEach(d => {
    const data = d.data();
    if (data.createdAt && now - data.createdAt >= expiryMs) queueDelete(d.ref);
  });

  if (opCount > 0) commits.push(batch.commit());
  await Promise.all(commits);
  logger.info(`Cleanup: read=${readSnap.size} delivered=${deliveredSnap.size} deletedForEveryone=${deletedSnap.size} staleChecked=${staleSnap.size}`);
});

/**
 * testPush — callable from the app (Settings → "Send test notification").
 * Sends a push to the CALLING user's own saved fcmToken and returns a
 * specific, actionable reason on failure instead of the app just silently
 * never receiving anything. This exists because "notifications don't
 * arrive" can fail at several different points (token never saved, this
 * function never deployed, FCM send itself rejected) and there was no way
 * to tell which one from the client side alone.
 */
exports.testPush = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please sign in again before testing notifications.');
  try {
    const uid = request.auth.uid;
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return { success: false, reason: 'user-doc-not-found' };
    const user = userSnap.data();
    const tokens = [...new Set([...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []), user.fcmToken].filter(t => typeof t === 'string' && t.trim()))];
    if (!tokens.length) return { success: false, reason: 'no-fcm-token-saved — allow notifications and reopen the app to register this device' };
    const result = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: 'Crizon', body: 'Test notification — if you see this, push is working! ✅' },
      android: { priority: 'high', notification: { channelId: 'messages', sound: 'default' } },
    });
    const sent = result.responses.filter(r => r.success).length;
    const failures = result.responses.filter(r => !r.success).map(r => r.error?.code || 'unknown');
    if (!sent) return { success: false, reason: `fcm-send-failed: ${failures.join(', ') || 'no device accepted the message'}` };
    return { success: true, sent, failed: failures.length };
  } catch (e) {
    logger.error('testPush failed', { uid: request.auth?.uid || null, code: e?.code || 'unknown', message: e?.message || String(e) });
    return { success: false, reason: `server-error: ${e?.code || 'unknown'} — ${e?.message || String(e)}` };
  }
});

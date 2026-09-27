// Bundled locally (via esbuild, from the exact plugin versions installed in
// package.json / node_modules) so it always matches what `cap sync` wired up
// natively — no runtime CDN fetch, no version-guessing, no silent failure.
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Media } from '@capacitor-community/media';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

let barsInited = false;

// Called once per screen render (see render() in index.html). The status
// bar (top) matches that screen's own header; the navigation bar (bottom)
// matches whatever sits at the very bottom of that screen (the input bar /
// tab bar), which in WhatsApp's own design is white on chat screens even
// though the header above is green — they are NOT always the same color.
async function setBars(statusColor, statusDark, navColor, navDark) {
  if (!isNative()) return;
  try {
    if (!barsInited) { await StatusBar.setOverlaysWebView({ overlay: false }); barsInited = true; }
    await StatusBar.setBackgroundColor({ color: statusColor });
    await StatusBar.setStyle({ style: statusDark ? Style.Dark : Style.Light });
  } catch {}
  try {
    await NavigationBar.setNavigationBarColor({ color: navColor, darkButtons: !navDark });
  } catch {}
}

// albumIdentifier is REQUIRED on Android for Media.savePhoto/saveVideo (not
// documented obviously, easy to miss) — without it the native call rejects.
// We save into our own "Crizon" album (created once, reused after), which
// also means we don't need broad gallery-wide storage permissions.
let crizonAlbumId = null;
async function getOrCreateAlbum() {
  if (crizonAlbumId) return crizonAlbumId;
  try {
    const { albums } = await Media.getAlbums();
    const existing = albums && albums.find(a => a.name === 'Crizon');
    if (existing) { crizonAlbumId = existing.identifier; return crizonAlbumId; }
  } catch {}
  try {
    await Media.createAlbum({ name: 'Crizon' });
    const { albums } = await Media.getAlbums();
    const created = albums && albums.find(a => a.name === 'Crizon');
    if (created) { crizonAlbumId = created.identifier; return crizonAlbumId; }
  } catch {}
  return null;
}

// dataUrl must be a full "data:image/jpeg;base64,...." / "data:video/mp4;base64,...." string.
async function saveToGallery(dataUrl, isVideo) {
  if (!isNative()) throw new Error('not-native');
  const albumIdentifier = await getOrCreateAlbum();
  const opts = albumIdentifier ? { path: dataUrl, albumIdentifier } : { path: dataUrl };
  if (isVideo) return Media.saveVideo(opts);
  return Media.savePhoto(opts);
}

// Writes a document to the app's Documents folder (a real, persistent
// location — visible to a file manager, survives app restarts) and then
// opens it with whatever app the device has for that file type, the same
// "download + open" WhatsApp gives you for a PDF/doc attachment.
// base64Data must be WITHOUT the "data:...;base64," prefix (raw base64).
async function openDocument(base64Data, fileName, mimeType) {
  if (!isNative()) throw new Error('not-native');
  const safeName = (fileName || `file_${Date.now()}`).replace(/[^\w.\-]+/g, '_');
  await Filesystem.writeFile({ path: safeName, data: base64Data, directory: Directory.Documents });
  const { uri } = await Filesystem.getUri({ path: safeName, directory: Directory.Documents });
  await FileOpener.open({ filePath: uri, contentType: mimeType || undefined, openWithDefault: true });
  return uri;
}

// ===== Real push notifications (WhatsApp-style — arrive even when the app
// is backgrounded/closed) =====
// registerPush(): asks for permission, registers this device with FCM, and
// resolves with the FCM token so the caller (index.html) can save it on the
// user's Firestore profile. A small Cloud Function (see /functions) reads
// that token and sends the actual push whenever a new message is written.
async function registerPush() {
  if (!isNative()) return null;
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') return null;
    }
    // Must match the channelId the Cloud Function sends notifications with
    // (see functions/index.js), or Android falls back to a generic channel
    // with no custom sound/importance.
    try {
      await PushNotifications.createChannel({
        id: 'messages',
        name: 'Messages',
        description: 'New chat messages',
        importance: 5,
        visibility: 1,
      });
    } catch {}
    await PushNotifications.register();
    return await new Promise((resolve) => {
      let done = false;
      PushNotifications.addListener('registration', (token) => {
        if (done) return; done = true; resolve(token.value);
      });
      PushNotifications.addListener('registrationError', () => {
        if (done) return; done = true; resolve(null);
      });
      setTimeout(() => { if (!done) { done = true; resolve(null); } }, 10000);
    });
  } catch { return null; }
}

// Fires while the app is in the foreground and a push arrives — Android
// does NOT show a system-tray notification for foreground pushes by
// default (only background/killed does), so we show one ourselves via
// Local Notifications when the message isn't for the chat currently open.
function onPushReceived(cb) {
  if (!isNative()) return;
  PushNotifications.addListener('pushNotificationReceived', (n) => { try { cb(n); } catch {} });
}

// Fires when the user taps a system notification (app was backgrounded or
// killed) — used to deep-link straight into the right chat.
function onPushTapped(cb) {
  if (!isNative()) return;
  PushNotifications.addListener('pushNotificationActionPerformed', (a) => { try { cb(a.notification); } catch {} });
}

async function showLocalNotification(title, body, extra) {
  if (!isNative()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [{ id: Math.floor(Math.random() * 1000000), title, body, extra }],
    });
  } catch {}
}

window.NativeBridge = {
  isNative, setBars, saveToGallery, openDocument,
  registerPush, onPushReceived, onPushTapped, showLocalNotification,
};

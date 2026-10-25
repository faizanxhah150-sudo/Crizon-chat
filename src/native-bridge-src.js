// Bundled locally (via esbuild, from the exact plugin versions installed in
// package.json / node_modules) so it always matches what `cap sync` wired up
// natively — no runtime CDN fetch, no version-guessing, no silent failure.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Media } from '@capacitor-community/media';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
const DocumentDownload = registerPlugin('DocumentDownload');

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
//
// Found the real cause of the "Copy file not found ... EPERM" errors by
// reading the plugin's actual Android source: getAlbums() doesn't only
// return albums we created — on a device that's being used for
// development, it ALSO scans the whole device's MediaStore for any
// existing folder containing photos/videos and reports those as albums
// too, using that folder's own name. If some unrelated folder elsewhere on
// the device (e.g. a synced project folder) happens to also be named
// "Crizon" and already has an image in it, matching purely by name picked
// THAT folder instead of our own app-writable one — and our app has no
// write access to it, hence "Operation not permitted". The fix: only
// accept a match whose identifier path is actually inside our own app's
// external media directory (getAlbumsPath()), never anything else that
// merely shares the name.
let crizonAlbumId = null;
async function getOrCreateAlbum() {
  if (crizonAlbumId) return crizonAlbumId;
  let basePath = null;
  try { basePath = (await Media.getAlbumsPath()).path; } catch {}
  const isOurs = a => a && a.name === 'Crizon' && a.identifier && (!basePath || a.identifier.startsWith(basePath));
  try {
    const { albums } = await Media.getAlbums();
    const existing = albums && albums.find(isOurs);
    if (existing) { crizonAlbumId = existing.identifier; return crizonAlbumId; }
  } catch {}
  try {
    await Media.createAlbum({ name: 'Crizon' });
    const { albums } = await Media.getAlbums();
    const created = albums && albums.find(isOurs);
    if (created) { crizonAlbumId = created.identifier; return crizonAlbumId; }
  } catch {}
  return null;
}

// dataUrl must be a full "data:image/jpeg;base64,...." / "data:video/mp4;base64,...." string.
//
// This used to pass the base64 data URL straight through as `path` (the
// plugin's docs say that's supported), but in practice that was producing
// bizarre "Copy file not found: /storage/emulated/0/..." errors pointing at
// paths we never specified — a sign the plugin's path-type detection was
// getting confused by a large base64 string, not actually treating it as
// embedded data. Writing it to a real temp file first and handing Media a
// plain file:// URI instead sidesteps that detection entirely — it's an
// unambiguous file path, nothing to misinterpret.
async function saveToGallery(dataUrl, isVideo) {
  if (!isNative()) throw new Error('not-native');
  const albumIdentifier = await getOrCreateAlbum();
  const base64Raw = dataUrl.split(',')[1] || dataUrl;
  const tmpName = `crizon_tmp_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
  await Filesystem.writeFile({ path: tmpName, data: base64Raw, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: tmpName, directory: Directory.Cache });
  const opts = albumIdentifier ? { path: uri, albumIdentifier } : { path: uri };
  try {
    const result = isVideo ? await Media.saveVideo(opts) : await Media.savePhoto(opts);
    return result;
  } finally {
    Filesystem.deleteFile({ path: tmpName, directory: Directory.Cache }).catch(() => {});
  }
}

// Writes a document, then opens it with whatever app the device has for
// that file type — the same "download + open" WhatsApp gives you for a
// PDF/doc attachment. Uses Directory.Cache, NOT Directory.Documents: on
// Android 11+ the public Documents/ExternalStorage folders are blocked by
// scoped storage and writeFile() there fails with "FILE_NOTCREATED" — this
// was the actual cause of documents never opening. Cache is always
// writable without extra permissions and is exactly what FileOpener needs.
// base64Data must be WITHOUT the "data:...;base64," prefix (raw base64).
// Save an attachment outside the temporary cache so it remains after the app closes.
// On Android versions that block direct public Downloads writes, fall back to the
// app's persistent Documents area and return its exact location rather than claiming
// that a public Downloads write succeeded.
async function downloadFile(base64Data, fileName, mimeType) {
  if (!isNative()) throw new Error('not-native');
  const safeName = (fileName || `file_${Date.now()}`).replace(/[^\w.\-]+/g, '_');
  const base64Raw = String(base64Data || '').replace(/^data:[^,]*,/, '');
  if (!base64Raw) throw new Error('empty-file-data');
  // Native Android MediaStore writes to the real public Downloads collection.
  // This avoids Android 10+ scoped-storage failures from Filesystem.ExternalStorage.
  const result = await DocumentDownload.save({ base64Data: base64Raw, fileName: safeName, mimeType: mimeType || 'application/octet-stream' });
  if (!result || !result.path) throw new Error('android-download-save-unconfirmed');
  return result;
}

async function downloadRemoteFile(url, fileName, mimeType) {
  if (!isNative()) throw new Error('not-native');
  if (!url) throw new Error('missing-download-url');
  const safeName = (fileName || `file_${Date.now()}`).replace(/[^\w.\-]+/g, '_');
  // Fetch the remote file natively and stream it into MediaStore Downloads,
  // so both sender and receiver devices use the same real download path.
  const result = await DocumentDownload.saveRemote({ url: String(url), fileName: safeName, mimeType: mimeType || 'application/octet-stream' });
  if (!result || !result.path) throw new Error('android-remote-download-save-unconfirmed');
  return result;
}

async function openDocument(base64Data, fileName, mimeType) {
  if (!isNative()) throw new Error('not-native');
  const safeName = (fileName || `file_${Date.now()}`).replace(/[^\w.\-]+/g, '_');
  await Filesystem.writeFile({ path: safeName, data: base64Data, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: safeName, directory: Directory.Cache });
  await FileOpener.open({ filePath: uri, contentType: mimeType || undefined, openWithDefault: true });
  return uri;
}

// ===== Real push notifications (WhatsApp-style — arrive even when the app
// is backgrounded/closed) =====
// registerPush(): asks for permission, registers this device with FCM, and
// resolves with the FCM token so the caller (index.html) can save it on the
// user's Firestore profile. A small Cloud Function (see /functions) reads
// that token and sends the actual push whenever a new message is written.
// Returns { token, error } instead of just a token-or-null — the caller
// (index.html) surfaces `error` as a toast so a failure here (denied
// permission, registration timeout, etc.) is actually visible instead of
// silently producing "notifications just don't arrive" with no clue why.
async function registerPush() {
  if (!isNative()) return { token: null, error: 'not-native' };
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') return { token: null, error: 'permission-denied' };
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
    const attempt = (timeoutMs) => new Promise((resolve) => {
      let done = false;
      const regListener = PushNotifications.addListener('registration', (token) => {
        if (done) return; done = true; resolve({ token: token.value, error: null });
      });
      const errListener = PushNotifications.addListener('registrationError', (err) => {
        if (done) return; done = true; resolve({ token: null, error: 'registration-error: ' + (err && err.error || 'unknown') });
      });
      PushNotifications.register();
      setTimeout(() => { if (!done) { done = true; resolve({ token: null, error: 'registration-timeout' }); } }, timeoutMs);
    });
    // One retry on timeout — a transient network hiccup at the exact
    // moment of the first attempt shouldn't permanently fail notification
    // setup for the rest of the session.
    let result = await attempt(10000);
    if (result.error === 'registration-timeout') result = await attempt(15000);
    return result;
  } catch (e) { return { token: null, error: 'exception: ' + (e && e.message || e) }; }
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

// Local notifications shown while the app is foregrounded need their own tap
// listener; they do not emit pushNotificationActionPerformed.
function onLocalNotificationTapped(cb) {
  if (!isNative()) return;
  LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    try { cb({ data: a.notification?.extra || {}, extra: a.notification?.extra || {}, title: a.notification?.title || '', body: a.notification?.body || '' }); } catch {}
  });
}

async function hideSplashScreen() {
  if (!isNative()) return;
  try { await SplashScreen.hide({ fadeOutDuration: 0 }); } catch {}
}

async function showLocalNotification(title, body, extra) {
  if (!isNative()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [{ id: Math.floor(Math.random() * 1000000), title, body, extra, smallIcon: 'ic_launcher_monochrome', iconColor: '#087f70' }],
    });
  } catch {}
}

window.NativeBridge = {
  isNative, setBars, saveToGallery, openDocument, downloadFile, downloadRemoteFile,
  registerPush, onPushReceived, onPushTapped, onLocalNotificationTapped, hideSplashScreen, showLocalNotification,
};

// Bundled locally (via esbuild, from the exact plugin versions installed in
// package.json / node_modules) so it always matches what `cap sync` wired up
// natively — no runtime CDN fetch, no version-guessing, no silent failure.
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Media } from '@capacitor-community/media';

const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

let barsInited = false;

// Called once per screen render (see render() in index.html) with that
// screen's own header color, so both system bars always match instead of
// defaulting to white. Only one function/call site now — a previous version
// had a separate one-time "init" call racing with this per-screen call,
// which was why the splash screen sometimes still flashed teal instead of
// black: whichever call reached the native side last won.
async function setBars(color, dark) {
  if (!isNative()) return;
  try {
    if (!barsInited) { await StatusBar.setOverlaysWebView({ overlay: false }); barsInited = true; }
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {}
  try {
    await NavigationBar.setNavigationBarColor({ color, darkButtons: !dark });
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

window.NativeBridge = { isNative, setBars, saveToGallery };

# Targeted Crizon chat fixes (2026-10-25)

This patch is limited to the reported chat bugs:

- Live profile document listeners refresh the contact avatar/name while the chat list or chat is open. Image URLs are refreshed to avoid a stale WebView cache.
- Attachment downloads first reuse the locally cached media. If not cached, the app tries the remote URL and reports HTTP 401/403 rather than claiming success when Cloudinary has a private/expired URL. On Android, it tries public `Download/` storage and falls back to the app's durable Documents directory when scoped-storage restrictions reject public writes.
- Message action selection now requires a deliberate 5.5-second press. A short press/context-menu event no longer opens the delete action.
- Opening a chat paints cached messages at the bottom immediately, without delayed scroll-to-bottom timers. On the first live snapshot, it only positions at the bottom if the user has not interacted; later snapshots preserve the current scroll position when the user is reading older messages.
- The existing offline chat-list retention fix is preserved.

## Build

This repository's `www/index.html` expects the generated `www/native-bridge.js` and `www/app.bundle.js` files. Generate them with:

```sh
npm install
npm run build
```

Then use the project's normal Capacitor Android build/sync workflow.

## Important download limitation

If a message's Cloudinary URL is already private, expired, or returns HTTP 401/403 and there is no local cached copy on this phone, client-side code cannot reconstruct the missing file. That attachment must be re-uploaded or its Cloudinary delivery access fixed. The patch will show a real failure instead of a false success.

Android 11+ may block apps from writing arbitrary files directly into the public Downloads directory. The native bridge therefore tries `Download/` first and uses the app's Documents directory as a durable fallback. The returned path is shown in the download toast.

These are source-level changes; they must be built and tested on the target Android device to confirm device-specific storage permissions and Firebase/Cloudinary access.

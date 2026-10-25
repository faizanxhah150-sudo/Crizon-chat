# Crizon startup and offline-cache changes

This source update targets the requested Android/WebView behavior:

- The native launch splash remains visible until the first splash web frame is painted; the first web splash frame uses complete uppercase lettering and no letter-by-letter blank animation to reduce cold-start flashes.
- A previously saved local session routes directly to the chat list without waiting for network access. A user with no saved session goes to Login after the splash/auth check.
- The chat list is painted from `crizon_chatlist_<uid>` in local storage first. Offline Firestore snapshots no longer replace an existing cached list with an empty list. A background refresh is retried when connectivity returns.
- Notification payload lookup accepts sender username and/or sender UID when the local chat-list cache is available, allowing direct chat navigation without a network lookup.
- Sent text/media is cached on the sender's device before the Firestore relay write can be observed by the receiver. Incoming messages and downloaded media are saved to the receiver's local cache before delivery status is acknowledged.
- Existing scheduled Firebase cleanup remains responsible for deleting delivered/read Firestore relay documents after its short retention window. This grace period allows another signed-in device to sync. Media files are cached locally before the Cloudinary copy is removed.
- Offline text and media remain in the local outbox and are retried when the `online` event fires.

## Build

Run `npm install`, `npm run build`, then follow the repository's existing GitHub Actions workflow to create the Android APK. This archive was source-checked with `node --check`; an Android APK build and live device test were not completed in this environment.

## Additional critical fixes in this archive

- Settings (`renderProfile`) now paints from the locally saved session/profile immediately. Its Firestore profile refresh is fire-and-forget and updates the visible profile only if the user is still on Settings.
- Per-account local read fences are stored under `crizon_read_fence_<uid>`. Opening a conversation persists its read-through timestamp and marks cached incoming messages read. Thread reconciliation preserves a locally read status when an older Firestore snapshot still says unread/delivered, and chat-list unread counts use the reconciled cached list.
- Chat-list previews now render a clock (`◷`) for messages in the offline outbox, matching the pending indicator shown inside the conversation. Successful outbox delivery switches the preview back to the normal sent tick.
- Native SplashScreen is configured to remain visible until the app's first branded web splash frame is painted, and the HTML shell background now matches the splash's black background to avoid a contrasting blank frame.

## Verification status for this archive

- `node --check src/app.js`: passed.
- `node --check src/native-bridge-src.js`: passed.
- `capacitor.config.json` JSON parse: passed.
- ZIP integrity (`unzip -t`): passed.
- `npm install` did not complete in this environment, so the production bundle/APK was not built here. Run the repository workflow (`npm install`, `npm run build`, Android build) and test on a real Android device before releasing.

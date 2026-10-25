# Crizon message relay and free Spark limitations

Implemented in this source tree:
- New Chat lists existing contacts and only performs exact-username lookups for discovery.
- Chat-list synchronization looks up only saved contact usernames rather than downloading every user document.
- Received text metadata is persisted locally before acknowledgement; media is acknowledged only after its bytes are written to IndexedDB.
- App-open/online best-effort cleanup removes acknowledged Firestore relay documents after 15 minutes and undelivered `sent` documents after 30 days.
- Native splash maximum launch duration is reduced; the HTML splash animation remains unchanged.

Important limitations:
- Firebase Spark does not provide reliable scheduled Cloud Functions execution. Client cleanup runs only when a signed-in device opens/resumes the app and has connectivity; it cannot guarantee a strict server-side deletion deadline.
- Cloudinary deletion requires a trusted server-side API secret. The secret was removed from client code; do not put it back in the APK. Therefore this client-only Spark build cannot securely guarantee deletion of Cloudinary media within 15 minutes. Configure a trusted backend with secret storage if/when available, or use Cloudinary's account-side retention controls if supported by the account.
- The existing `functions/index.js` includes scheduled cleanup and push logic, but deploying/running Cloud Functions may require enabling billing. The app's client-side cleanup is only best effort.
- Firebase client configuration and unsigned upload presets are not secret credentials. Lock down Firebase Security Rules and restrict the Cloudinary upload preset/usage.

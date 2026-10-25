# Crizon free push worker — no Firebase Cloud Functions for push

This Cloudflare Worker sends Firebase Cloud Messaging (FCM HTTP v1) notifications for new Crizon text, image, video, audio, and document messages. The app saves each native device FCM token on `users/{uid}.fcmToken` and in `users/{uid}.fcmTokens`; after a message is saved to the chat thread, the app posts to this Worker for the recipient. It does not replace Firebase Auth/Firestore or FCM itself.

## Security first

A Firebase Admin service-account private key was shared in chat during setup. **Do not use that key. Revoke/delete it in Google Cloud Console and create a new key** before configuring this Worker. Never place the JSON in `www/`, the app, or this ZIP. The helper below reads a new JSON file locally and stores only the email/private key as Cloudflare Worker secrets.

## Deploy from a computer with Node.js 20+

1. Extract this project and open a terminal in `crizon-app/push-worker`.
2. Sign in to Cloudflare: `npx wrangler login`.
3. Enable the Firebase Cloud Messaging API for Firebase project `crizon-6f77e`. Ensure the new service account has least-privilege access needed to read the relevant Firestore user documents and send FCM messages.
4. Run the helper with the **new, rotated** service-account JSON path:

   ```bash
   node setup-worker.mjs /absolute/path/to/NEW-service-account.json
   ```

   It pipes the email and private key directly to Wrangler secret commands; it does not copy the JSON into this folder. If Wrangler does not accept piped input in your installed version, set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` manually with `npx wrangler secret put ...`.

5. Deploy:

   ```bash
   npx wrangler deploy
   ```

6. Copy the deployed `https://...workers.dev` URL. In `www/index.html`, set `CFG.pushWorkerUrl` to that exact URL. Do not leave it blank.
7. Rebuild the Android app, install it on two real devices, grant notification permission, and test by sending text, photo, video, voice message, and document messages to a different user account while the receiving app is backgrounded/closed. The Settings test button has been removed from the app UI.

## What remains required

- A Cloudflare account and successful Worker deployment.
- A valid new service-account key stored as Worker secrets (not in source code).
- FCM API enabled, valid recipient FCM token(s), Android notification permission, and network access.
- A new Android APK after changing `CFG.pushWorkerUrl`.

Cloudflare Worker availability/pricing can change. If Cloudflare asks for billing details, stop rather than entering card information; no deployment can be completed from this project ZIP alone.

## Limitations

- Push is sent by the Worker using FCM HTTP v1. The app cannot reliably wake itself to show notifications when fully closed using client-side JavaScript alone.
- Scheduled Firestore cleanup is separate from push. Without deployed scheduled Cloud Functions, server-side cleanup will not run; app-side expiry handling is not a substitute for guaranteed server cleanup.

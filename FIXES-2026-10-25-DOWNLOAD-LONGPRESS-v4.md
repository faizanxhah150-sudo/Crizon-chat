# Crizon targeted fixes v4

- Message long-press delete/select timer is now 3 seconds. Interactive download controls are excluded from the row long-press gesture.
- Android downloads now use a small Capacitor native plugin backed by Android MediaStore, saving visible files under `Internal storage/Download/Crizon/`. This avoids the unreliable `Filesystem.Directory.ExternalStorage` write on modern Android.
- Both already-cached files and remote Cloudinary URLs use the same native Downloads destination. The app reports failure instead of showing a misleading “Download started” message when the native save is not confirmed.
- If a remote URL is expired/private or returns HTTP 401/403, it still cannot be downloaded until that source file/access URL is repaired; no client-side code can recover a file that the server refuses to serve.

Build with `npm install`, `npm run build`, then run the existing Android build workflow (which runs `scripts/patch-android.sh` after `cap add android`). Device testing is still required.

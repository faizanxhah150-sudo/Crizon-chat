# Crizon targeted fixes (2026-10-25, v3)

Changes are deliberately limited to the reported download/gesture issues:

- Message long-press threshold is now 4 seconds.
- File-download button stops pointer/touch/mouse gesture propagation, so tapping it cannot start the message-row long-press timer or accidentally select a message.
- Download taps are guarded against duplicate concurrent attempts and the button is temporarily disabled while the operation is running.
- Native download rejects empty data and reports the actual persistent destination/failure rather than pretending that a public Downloads write succeeded.

## Important Android storage note

Android 10+ scoped storage may block arbitrary writes into the public `Download` folder. In that case the native bridge falls back to the app's persistent Documents area and reports that location. To guarantee public Downloads for every Android version/device, the Android native layer must expose a MediaStore/DownloadManager implementation in the actual Android wrapper and be built into the APK.

## Receiver-side download note

Incoming media is cached in IndexedDB by the existing auto-download path. The manual download button first uses that device-local cached blob where available, then attempts the Cloudinary URL. If Cloudinary returns HTTP 401/403 because an uploaded asset is private/expired, client-only code cannot make that asset public; the upload preset/delivery permissions or original asset must be corrected. No backend secrets are added to the client.

## Validation

JavaScript source syntax is checked as part of the build. Device testing is still required for public Downloads access and receiver-side Cloudinary delivery. No visual redesign was made.

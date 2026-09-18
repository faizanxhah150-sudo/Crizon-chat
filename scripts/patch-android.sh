#!/bin/bash
# Runs inside CI after `npx cap add android`.
# Adds the permissions a WhatsApp-style app needs (mic, camera, notifications,
# media access for auto-download, call-related foreground service) without
# touching any UI/design files.
set -e

MANIFEST="android/app/src/main/AndroidManifest.xml"

if [ ! -f "$MANIFEST" ]; then
  echo "AndroidManifest.xml not found at $MANIFEST"
  exit 1
fi

PERMS='  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
  <uses-permission android:name="android.permission.BLUETOOTH" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  <uses-permission android:name="android.permission.VIBRATE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
  <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
  <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />'

# Insert permissions right after the opening <manifest ...> tag, only if not already patched
if ! grep -q "RECORD_AUDIO" "$MANIFEST"; then
  awk -v perms="$PERMS" '
    /<manifest/ && !done {
      print $0
      print perms
      done=1
      next
    }
    { print }
  ' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
  echo "Permissions injected into $MANIFEST"
else
  echo "Manifest already patched, skipping"
fi

# The bottom system navigation bar (gesture pill / 3-button bar) defaults to
# white, which — like the status bar — was a giveaway that this is a wrapped
# website. AppTheme.NoActionBar is the standard style name in Capacitor's
# default Android template; add navigationBarColor to it, same targeted
# insert-after-match technique as the manifest patch above (safe: only ever
# adds lines, never rewrites the file wholesale, so it can't clobber anything
# Capacitor's template needs).
STYLES="android/app/src/main/res/values/styles.xml"
if [ -f "$STYLES" ] && ! grep -q "android:navigationBarColor" "$STYLES"; then
  awk '
    /<style name="AppTheme.NoActionBar"/ && !done {
      print $0
      print "        <item name=\"android:navigationBarColor\">@color/colorPrimaryDark</item>"
      print "        <item name=\"android:windowLightNavigationBar\">false</item>"
      done=1
      next
    }
    { print }
  ' "$STYLES" > "$STYLES.tmp" && mv "$STYLES.tmp" "$STYLES"
  echo "Navigation bar color injected into $STYLES"
else
  echo "styles.xml not found or already patched, skipping nav bar color"
fi

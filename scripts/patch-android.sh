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

# Firebase Cloud Messaging needs the google-services Gradle plugin applied.
# Capacitor's default app/build.gradle ALREADY has a conditional block that
# applies it automatically once google-services.json exists (which our
# workflow already copies in) — so the only thing actually missing is the
# classpath declaration in the project-level build.gradle.
PROJECT_GRADLE="android/build.gradle"
if [ -f "$PROJECT_GRADLE" ] && ! grep -q "com.google.gms:google-services" "$PROJECT_GRADLE"; then
  awk '
    /classpath .com\.android\.tools\.build:gradle/ && !done {
      print $0
      print "        classpath \x27com.google.gms:google-services:4.4.2\x27"
      done=1
      next
    }
    { print }
  ' "$PROJECT_GRADLE" > "$PROJECT_GRADLE.tmp" && mv "$PROJECT_GRADLE.tmp" "$PROJECT_GRADLE"
  echo "google-services classpath injected into $PROJECT_GRADLE"
else
  echo "$PROJECT_GRADLE not found or already patched, skipping"
fi

# Give push notifications a proper icon/color instead of Android's default
# white-square fallback. Goes inside <application>, not at manifest root
# like the uses-permission block above. The <application ...> opening tag
# spans multiple lines in a real manifest, so (unlike the single-line
# <manifest> tag above) we can't just insert after the first matching line —
# that would land the meta-data tags INSIDE the still-open opening tag,
# before its closing ">", producing invalid XML. Instead we track state and
# insert only once we've actually seen that closing ">".
if ! grep -q "default_notification_icon" "$MANIFEST"; then
  awk '
    {
      print $0
      if (!done) {
        if ($0 ~ /<application/) { inapp=1 }
        if (inapp && $0 ~ />[ \t]*$/ && $0 !~ /\/>[ \t]*$/) {
          print "        <meta-data android:name=\"com.google.firebase.messaging.default_notification_icon\" android:resource=\"@mipmap/ic_launcher\" />"
          print "        <meta-data android:name=\"com.google.firebase.messaging.default_notification_color\" android:resource=\"@color/colorPrimaryDark\" />"
          print "        <meta-data android:name=\"com.google.firebase.messaging.default_notification_channel_id\" android:value=\"messages\" />"
          done=1
          inapp=0
        }
      }
    }
  ' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
  echo "FCM notification icon/color meta-data injected into $MANIFEST"
else
  echo "Manifest already has FCM notification meta-data, skipping"
fi

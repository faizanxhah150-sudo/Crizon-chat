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

# A grey system status/nav bar was still flashing for a moment at cold
# launch, before our splash screen (or any of our JS) gets a chance to run
# — that's the THEME'S own default bar color showing through during the
# very first frame, specifically the launch theme Capacitor uses WHILE the
# native splash screen is up (AppTheme.NoActionBarLaunch), which is
# separate from AppTheme.NoActionBar patched above and wasn't covered by
# it. Pin it to the same black as the splash background so there's no gap
# at all. <style name="X" parent="Y"> tags are normally one line (unlike
# <application>), but use the same multi-line-safe insert-after-closing-">"
# technique as the manifest's <application> patch anyway, just in case.
if [ -f "$STYLES" ] && grep -q "AppTheme.NoActionBarLaunch" "$STYLES" && ! grep -q "android:navigationBarColor.*050505\|NoActionBarLaunch.*statusBarColor" "$STYLES"; then
  awk '
    {
      print $0
      if (!done) {
        if ($0 ~ /<style name="AppTheme\.NoActionBarLaunch"/) { intheme=1 }
        if (intheme && $0 ~ />[ \t]*$/ && $0 !~ /\/>[ \t]*$/) {
          print "        <item name=\"android:statusBarColor\">#050505</item>"
          print "        <item name=\"android:navigationBarColor\">#050505</item>"
          print "        <item name=\"android:windowLightStatusBar\">false</item>"
          print "        <item name=\"android:windowLightNavigationBar\">false</item>"
          done=1
          intheme=0
        }
      }
    }
  ' "$STYLES" > "$STYLES.tmp" && mv "$STYLES.tmp" "$STYLES"
  echo "Launch-theme bar colors (black, matching splash) injected into $STYLES"
else
  echo "AppTheme.NoActionBarLaunch not found or already patched, skipping launch bar colors"
fi

# Firebase Cloud Messaging needs the google-services Gradle plugin applied.
# Capacitor's default app/build.gradle ALREADY has a conditional block that
# applies it automatically once google-services.json exists (which our
# workflow already copies in) — so the only thing actually missing is the
# classpath declaration in the project-level build.gradle.
#
# This used to try to insert the classpath line by matching the AGP
# classpath line's exact text — fragile, since that line's version string
# can vary between Capacitor/Gradle versions, and a non-match would
# silently inject nothing (no build error — just a push notification
# system that never actually initializes natively, which is exactly why
# registration was hanging forever instead of failing loudly). Anchoring on
# the literal text "dependencies {" inside the buildscript block instead is
# version-string-independent — that text is structural, not something that
# changes between Gradle/AGP releases — and inserting right after it is
# always valid regardless of whatever else is already in that block.
PROJECT_GRADLE="android/build.gradle"
if [ -f "$PROJECT_GRADLE" ] && ! grep -q "com.google.gms:google-services" "$PROJECT_GRADLE"; then
  awk '
    {
      print $0
      if (!done) {
        if ($0 ~ /buildscript[ \t]*\{/) { inbs=1 }
        if (inbs && $0 ~ /dependencies[ \t]*\{/) {
          print "        classpath \x27com.google.gms:google-services:4.4.2\x27"
          done=1
        }
      }
    }
  ' "$PROJECT_GRADLE" > "$PROJECT_GRADLE.tmp" && mv "$PROJECT_GRADLE.tmp" "$PROJECT_GRADLE"
  if grep -q "com.google.gms:google-services" "$PROJECT_GRADLE"; then
    echo "google-services classpath injected into $PROJECT_GRADLE"
  else
    # Structural anchor genuinely wasn't found (no buildscript/dependencies
    # block at all) — fall back to a self-contained block so this can never
    # silently no-op.
    cat >> "$PROJECT_GRADLE" << 'GRADLE_EOF'

buildscript {
    repositories { google(); mavenCentral() }
    dependencies { classpath 'com.google.gms:google-services:4.4.2' }
}
GRADLE_EOF
    echo "Fallback: appended standalone buildscript block to $PROJECT_GRADLE"
  fi
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
          print "        <meta-data android:name=\"com.google.firebase.messaging.default_notification_icon\" android:resource=\"@mipmap/ic_launcher_monochrome\" />"
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
  # Ensure an existing configuration uses Android's dedicated monochrome
  # small icon (a full-colour launcher icon renders as a generic glyph).
  sed -i 's#android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/ic_launcher"#android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/ic_launcher_monochrome"#g' "$MANIFEST"
  sed -i 's#android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_notification"#android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/ic_launcher_monochrome"#g' "$MANIFEST"
  echo "Manifest already has FCM notification meta-data; monochrome icon verified"
fi


# Register a native MediaStore-backed document downloader. Android 10+ blocks
# many direct writes to /storage/emulated/0/Download; MediaStore is the supported
# way to save user-visible files without broad storage permissions.
JAVA_DIR="android/app/src/main/java/com/crizon/app"
mkdir -p "$JAVA_DIR"
cat > "$JAVA_DIR/DocumentDownloadPlugin.java" <<'JAVA_EOF'
package com.crizon.app;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

@CapacitorPlugin(name = "DocumentDownload")
public class DocumentDownloadPlugin extends Plugin {
  @PluginMethod public void save(PluginCall call) {
    String data = call.getString("base64Data");
    String name = safeName(call.getString("fileName", "download.bin"));
    String mime = call.getString("mimeType", "application/octet-stream");
    if (data == null || data.isEmpty()) { call.reject("empty-file-data"); return; }
    try { saveStream(call, new ByteArrayInputStream(android.util.Base64.decode(data, android.util.Base64.DEFAULT)), name, mime); }
    catch (Exception e) { call.reject("download-save-failed: " + e.getMessage(), e); }
  }

  @PluginMethod public void saveRemote(PluginCall call) {
    String rawUrl = call.getString("url");
    String name = safeName(call.getString("fileName", "download.bin"));
    String mime = call.getString("mimeType", "application/octet-stream");
    if (rawUrl == null || rawUrl.isEmpty()) { call.reject("missing-download-url"); return; }
    HttpURLConnection connection = null;
    try {
      URL url = new URL(rawUrl);
      if (!"https".equalsIgnoreCase(url.getProtocol()) && !"http".equalsIgnoreCase(url.getProtocol())) throw new Exception("unsupported-url-scheme");
      connection = (HttpURLConnection) url.openConnection();
      connection.setConnectTimeout(20000); connection.setReadTimeout(60000); connection.setInstanceFollowRedirects(true);
      connection.setRequestMethod("GET");
      int status = connection.getResponseCode();
      if (status < 200 || status >= 300) throw new Exception("download-http-" + status);
      String responseType = connection.getContentType();
      if (responseType != null && !responseType.isEmpty() && "application/octet-stream".equals(mime)) mime = responseType.split(";")[0].trim();
      saveStream(call, connection.getInputStream(), name, mime);
    } catch (Exception e) { call.reject("remote-download-failed: " + e.getMessage(), e); }
    finally { if (connection != null) connection.disconnect(); }
  }

  private void saveStream(PluginCall call, InputStream input, String name, String mime) throws Exception {
    Uri uri = null;
    OutputStream output = null;
    try {
      ContentValues values = new ContentValues();
      values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
      values.put(MediaStore.MediaColumns.MIME_TYPE, mime == null ? "application/octet-stream" : mime);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Crizon");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
      } else {
        values.put(MediaStore.MediaColumns.DATA, Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath() + "/" + name);
        uri = getContext().getContentResolver().insert(MediaStore.Files.getContentUri("external"), values);
      }
      if (uri == null) throw new Exception("mediastore-create-failed");
      output = getContext().getContentResolver().openOutputStream(uri, "w");
      if (output == null) throw new Exception("mediastore-open-output-failed");
      byte[] buffer = new byte[32768]; int count;
      while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
      output.flush(); output.close(); output = null;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ContentValues ready = new ContentValues(); ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
        getContext().getContentResolver().update(uri, ready, null, null);
      }
      JSObject ret = new JSObject(); ret.put("path", "Download/Crizon/" + name); ret.put("uri", uri.toString()); ret.put("mimeType", mime);
      call.resolve(ret);
    } catch (Exception e) {
      if (uri != null) try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
      throw e;
    } finally {
      try { if (output != null) output.close(); } catch (Exception ignored) {}
      try { input.close(); } catch (Exception ignored) {}
    }
  }

  private String safeName(String name) {
    if (name == null || name.trim().isEmpty()) return "download.bin";
    String cleaned = name.replaceAll("[^A-Za-z0-9._-]", "_");
    return cleaned.length() > 120 ? cleaned.substring(cleaned.length() - 120) : cleaned;
  }
}
JAVA_EOF

MAIN="android/app/src/main/java/com/crizon/app/MainActivity.java"
if [ -f "$MAIN" ] && ! grep -q 'DocumentDownloadPlugin.class' "$MAIN"; then
  cat > "$MAIN" <<'MAIN_EOF'
package com.crizon.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(DocumentDownloadPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
MAIN_EOF
fi

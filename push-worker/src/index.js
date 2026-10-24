
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const enc = (value) => new TextEncoder().encode(value);

// FIX: Safely parse Firebase private key in PEM, escaped PEM,
// or service-account JSON format.
function pemBytes(pem) {
  let text = String(pem || "").trim();

  // Remove wrapping quotes if the complete value was quoted.
  text = text.replace(/^["']|["']$/g, "");

  // Accept a full service-account JSON object if accidentally supplied.
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);

      if (parsed && typeof parsed.private_key === "string") {
        text = parsed.private_key;
      } else {
        throw new Error("private_key field is missing");
      }
    } catch {
      throw new Error(
        "FIREBASE_PRIVATE_KEY contains invalid JSON or has no private_key field."
      );
    }
  }

  // Convert escaped newlines into actual newlines.
  text = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");

  const begin = "-----BEGIN PRIVATE KEY-----";
  const finish = "-----END PRIVATE KEY-----";

  const start = text.indexOf(begin);
  const end = text.indexOf(finish);

  if (start < 0 || end < start) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY must contain the complete BEGIN PRIVATE KEY and END PRIVATE KEY block."
    );
  }

  const clean = text
    .slice(start + begin.length, end)
    .replace(/\s/g, "");

  // Validate Base64 characters and padding before decoding.
  if (
    !clean ||
    clean.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)
  ) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY has invalid Base64 characters or padding. Check the complete private_key value."
    );
  }

  let raw;

  try {
    raw = atob(clean);
  } catch {
    throw new Error(
      "Could not decode FIREBASE_PRIVATE_KEY. Check the complete private_key value."
    );
  }

  const out = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }

  return out.buffer;
}

function field(doc, key) {
  return doc?.fields?.[key];
}

function str(doc, key) {
  return field(doc, key)?.stringValue || "";
}

function strings(doc, key) {
  return (
    field(doc, key)?.arrayValue?.values
      ?.map((v) => v.stringValue)
      .filter(Boolean) || []
  );
}

async function googleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);

  const header = b64url(
    enc(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );

  const claim = b64url(
    enc(
      JSON.stringify({
        iss: env.FIREBASE_CLIENT_EMAIL,
        scope:
          "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );

  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(env.FIREBASE_PRIVATE_KEY),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    enc(unsigned)
  );

  const assertion = `${unsigned}.${b64url(signature)}`;

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Google OAuth failed (${response.status}): ${
        data.error_description || data.error || "no access token"
      }`
    );
  }

  return data.access_token;
}

async function verifiedUid(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new Error("missing-firebase-id-token");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      env.FIREBASE_API_KEY
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idToken: match[1],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.users?.[0]?.localId) {
    throw new Error("invalid-or-expired-firebase-id-token");
  }

  return data.users[0].localId;
}

async function getUserDoc(env, accessToken, uid) {
  const url =
    `https://firestore.googleapis.com/v1/projects/` +
    `${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/` +
    encodeURIComponent(uid);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Firestore user lookup failed (${response.status}): ${
        data.error?.message || "unknown error"
      }`
    );
  }

  return data;
}

function preview(body, type) {
  if (type === "image") return "📷 Photo";
  if (type === "video") return "🎥 Video";
  if (type === "audio") return "🎤 Voice message";

  if (type === "file") {
    return String(body || "📄 Document").slice(0, 120);
  }

  return String(body || "New message").slice(0, 120);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    if (request.method !== "POST") {
      return json(
        {
          success: false,
          error: "method-not-allowed",
        },
        405
      );
    }

    try {
      if (
        !env.FIREBASE_PROJECT_ID ||
        !env.FIREBASE_API_KEY ||
        !env.FIREBASE_CLIENT_EMAIL ||
        !env.FIREBASE_PRIVATE_KEY
      ) {
        return json(
          {
            success: false,
            error: "worker-secrets-not-configured",
          },
          500
        );
      }

      const uid = await verifiedUid(request, env);
      const input = await request.json();

      const toUid = String(input.toUid || "");
      const toUsername = String(input.toUsername || "").trim();
      const fromUsername = String(input.fromUsername || "").trim();
      const type = String(input.type || "text");

      if (!toUid || !toUsername || !fromUsername) {
        return json(
          {
            success: false,
            error: "missing-recipient-or-sender",
          },
          400
        );
      }

      const accessToken = await googleAccessToken(env);

      const [sender, recipient] = await Promise.all([
        getUserDoc(env, accessToken, uid),
        getUserDoc(env, accessToken, toUid),
      ]);

      if (
        !sender ||
        str(sender, "username").toLowerCase() !==
          fromUsername.toLowerCase()
      ) {
        return json(
          {
            success: false,
            error: "sender-profile-mismatch",
          },
          403
        );
      }

      if (
        !recipient ||
        str(recipient, "username").toLowerCase() !==
          toUsername.toLowerCase()
      ) {
        return json(
          {
            success: false,
            error: "recipient-profile-mismatch",
          },
          404
        );
      }

      const tokens = [
        ...new Set(
          [
            ...strings(recipient, "fcmTokens"),
            str(recipient, "fcmToken"),
          ].filter(Boolean)
        ),
      ];

      if (!tokens.length) {
        return json(
          {
            success: false,
            error: "recipient-has-no-fcm-token",
          },
          409
        );
      }

      const title =
        type === "test"
          ? "Crizon"
          : String(
              input.fromName ||
                str(sender, "name") ||
                fromUsername
            ).slice(0, 80);

      const body =
        type === "test"
          ? "Test notification — Crizon push is working!"
          : preview(input.body, type);

      const messageData = {
        fromUsername,
        fromUid: String(uid),
        fromName: title,
        fromProfileUrl: String(
          input.fromProfileUrl ||
            str(sender, "profileUrl") ||
            ""
        ),
        messageId: String(input.messageId || ""),
        type,
      };

      const results = await Promise.all(
        tokens.map(async (token) => {
          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: {
                    title,
                    body,
                  },
                  data: messageData,
                  android: {
                    priority: "HIGH",
                    notification: {
                      channel_id: "messages",
                      sound: "default",
                    },
                  },
                },
              }),
            }
          );

          const data = await response.json().catch(() => ({}));

          return {
            ok: response.ok,
            code:
              data.error?.status ||
              data.error?.message ||
              "",
            status: response.status,
          };
        })
      );

      const sent = results.filter((x) => x.ok).length;

      if (!sent) {
        return json(
          {
            success: false,
            error: `fcm-send-failed: ${results
              .map((x) => x.code || x.status)
              .join(", ")}`,
          },
          502
        );
      }

      return json({
        success: true,
        sent,
        failed: results.length - sent,
      });
    } catch (error) {
      return json(
        {
          success: false,
          error: String(error?.message || error).slice(0, 500),
        },
        500
      );
    }
  },
};

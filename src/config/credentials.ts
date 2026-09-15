// ============================================================
// CRIZON — ALL CREDENTIALS HARDCODED
// Private project — sirf 2 users (owner + dost)
// ============================================================

// ---------- FIREBASE ----------
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBfKEKEgE2SZUchDpKdTXmq68V60a1aT9s",
  authDomain: "crizon-6f77e.firebaseapp.com",
  databaseURL: "https://crizon-6f77e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crizon-6f77e",
  storageBucket: "crizon-6f77e.firebasestorage.app",
  messagingSenderId: "565513456297",
  appId: "1:565513456297:web:d73db49a9f2b0b930037b8",
};

// ---------- CLOUDINARY ----------
export const CLOUDINARY = {
  cloudName: "h8dhf04s",
  apiKey: "778428655374127",
  apiSecret: "UOTUfCmUWgpXuQk9KWWJDIXZcvg",
  uploadPreset: "myfile",
  uploadUrl: "https://api.cloudinary.com/v1_1/h8dhf04s/auto/upload",
  deleteUrl: "https://api.cloudinary.com/v1_1/h8dhf04s/delete_by_token",
  adminApiBase: "https://api.cloudinary.com/v1_1/h8dhf04s/resources",
};

// ---------- AGORA ----------
export const AGORA = {
  appId: "684c3607a9994e0ea8b8501888a60fd9",
};

// ---------- ONESIGNAL ----------
export const ONESIGNAL = {
  appId: "907a5d7f-cb1c-416c-8f20-25564a282b7c",
  restApiKey: "os_v2_app_sb5f276ldrawzdzaevleukblproa4e5uzuje6d4bnlhxxpfrueyrigydgrdley66ak26yuatfb4emuxq2jfztun6qyv5uvndp4tojvq",
};

// ---------- FIREBASE ADMIN (for backend functions / OneSignal FCM upload) ----------
export const FIREBASE_ADMIN = {
  type: "service_account",
  project_id: "crizon-6f77e",
  private_key_id: "6f85d6b7215cb185820b0dd1eb2ca1c2e2e41c4d",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC42vEu94g3DsIJ
TzuVqTR09AawVl4k6i61iibeXQdd3Lo1lIwtMcX+cINy88R6K/e5DUy8E15DPcjd
... (poori key tumne jo di thi)
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@crizon-6f77e.iam.gserviceaccount.com",
  client_id: "109598905284802605948",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40crizon-6f77e.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

// ---------- AI (Cloud Worker) ----------
export const AI = {
  baseUrl: "https://brain-api.faizanxhah150.workers.dev/v1",
  apiKey: "sk-faizan-ai",
  model: "openai/gpt-oss-120b",
};

// ---------- APP CONSTANTS ----------
export const APP = {
  name: "Crizon",
  usernameSuffix: "@crizon",
  maxUploadMB: 100,
  maxBandwidthMB: 24900,
  offlineExpiryDays: 30,
  bandwidthResetDay: 1,
};

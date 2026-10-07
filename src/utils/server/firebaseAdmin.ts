import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function parseServiceAccount(): Record<string, any> {
  let raw = (
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    ""
  ).trim();
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not configured");
  }

  // Handle leading/trailing single or double quotes from .env formatting
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields (client_email, private_key, project_id)");
    }
    // Normalize escaped newlines in private key if stringified
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (err: any) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${err?.message || "Invalid JSON"}`);
  }
}

export function getAdminApp(): App {
  if (!adminApp) {
    const existing = getApps();
    if (existing.length > 0) {
      adminApp = existing[0];
    } else {
      const creds = parseServiceAccount();
      adminApp = initializeApp({ credential: cert(creds) });
    }
  }
  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminDb) {
    getAdminApp();
    adminDb = getFirestore();
  }
  return adminDb;
}

export { FieldValue };

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(value: string) {
  return value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseServiceAccount(): ServiceAccount {
  const jsonRaw = stripWrappingQuotes(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
      ""
  );

  let parsed: Partial<ServiceAccount> | null = null;

  if (jsonRaw) {
    // Normal JSON service-account value.
    try {
      parsed = JSON.parse(jsonRaw) as Partial<ServiceAccount>;
    } catch {
      // Also accept a base64-encoded JSON service account. This avoids
      // problems caused by multiline/private-key escaping in Vercel env vars.
      try {
        const decoded = Buffer.from(jsonRaw, "base64").toString("utf8");
        parsed = JSON.parse(decoded) as Partial<ServiceAccount>;
      } catch {
        throw new Error(
          "FIREBASE_SERVICE_ACCOUNT_JSON is present but is not valid JSON. " +
            "Paste the complete service-account JSON as one environment-variable value, " +
            "or use FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
        );
      }
    }
  }

  const projectId =
    parsed?.project_id ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "";

  const clientEmail =
    parsed?.client_email ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    "";

  const privateKey = normalizePrivateKey(
    parsed?.private_key ||
      process.env.FIREBASE_PRIVATE_KEY ||
      ""
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Configure FIREBASE_SERVICE_ACCOUNT_JSON " +
        "(recommended), or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY " +
        "in the Vercel Production environment."
    );
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
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

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export { FieldValue };

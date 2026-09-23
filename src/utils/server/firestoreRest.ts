import crypto from "crypto";

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  const parsed = JSON.parse(raw) as {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is incomplete");
  }
  return parsed;
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const account = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: FIRESTORE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key.replace(/\\n/g, "\n"), "base64url");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth response did not contain an access token");
  return { token: data.access_token, projectId: account.project_id };
}

function stringValue(value: string) {
  return { stringValue: value };
}

function timestampValue(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

export async function updateRegistrationPaymentServerSide(args: {
  registrationId: string;
  paymentId: string;
  orderId: string;
  status?: string;
}) {
  const { token, projectId } = await getAccessToken();
  const fields = {
    status: stringValue(args.status || "paid"),
    paymentStatus: stringValue("paid"),
    razorpayPaymentId: stringValue(args.paymentId),
    razorpayOrderId: stringValue(args.orderId),
    paidAt: timestampValue(),
    updatedAt: timestampValue(),
  };

  const mask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/registrations/${encodeURIComponent(args.registrationId)}?${mask}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Firestore payment update failed: ${await response.text()}`);
  }
}

export async function saveRazorpayOrderIdServerSide(args: {
  registrationId: string;
  orderId: string;
}) {
  const { token, projectId } = await getAccessToken();
  const fields = {
    razorpayOrderId: stringValue(args.orderId),
    paymentStatus: stringValue("pending"),
    updatedAt: timestampValue(),
  };
  const mask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/registrations/${encodeURIComponent(args.registrationId)}?${mask}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Firestore order update failed: ${await response.text()}`);
}

export async function findRegistrationIdByOrderId(orderId: string) {
  const { token, projectId } = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "registrations" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "razorpayOrderId" },
            op: "EQUAL",
            value: stringValue(orderId),
          },
        },
        limit: 1,
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Firestore registration lookup failed: ${await response.text()}`);
  const rows = (await response.json()) as Array<{ document?: { name?: string } }>;
  const name = rows.find((row) => row.document?.name)?.document?.name;
  return name ? name.split("/documents/registrations/")[1] || null : null;
}

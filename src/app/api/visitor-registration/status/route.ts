import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseFirestoreValue(value: any): any {
  if (!value || typeof value !== "object") return value;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("stringValue" in value) return String(value.stringValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("referenceValue" in value) return value.referenceValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseFirestoreValue);
  if ("mapValue" in value) return parseFirestoreFields(value.mapValue.fields || {});
  return value;
}

function parseFirestoreFields(fields: Record<string, any>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, parseFirestoreValue(value)]));
}

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sparkz2k26-557bd";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

  let registrationOpen = true;
  let totalCapacity = 300;
  let fee = 250;
  let remainingTickets = totalCapacity;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/eventSettings/visitorPass${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;
    const response = await fetch(url, { cache: "no-store" });

    if (response.ok) {
      const document = await response.json();
      const data = parseFirestoreFields(document.fields || {});

      if (typeof data.registrationOpen === "boolean") registrationOpen = data.registrationOpen;
      if (typeof data.totalCapacity === "number" && data.totalCapacity > 0) totalCapacity = data.totalCapacity;
      if (typeof data.fee === "number" && data.fee >= 0) fee = data.fee;
      if (typeof data.remainingTickets === "number" && data.remainingTickets >= 0) {
        remainingTickets = data.remainingTickets;
      } else {
        remainingTickets = totalCapacity;
      }
    }
  } catch (error) {
    console.warn("Could not read public visitorPass settings:", error);
  }

  remainingTickets = Math.max(0, Math.min(totalCapacity, remainingTickets));

  return NextResponse.json({
    success: true,
    registrationOpen,
    totalCapacity,
    activeCount: Math.max(0, totalCapacity - remainingTickets),
    remainingTickets,
    isSoldOut: remainingTickets <= 0,
    fee,
  }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registrationId, action = "deregister", adminEmail } = body;

    if (!registrationId) {
      return NextResponse.json({ success: false, error: "Registration ID is required." }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("alumni_registrations").doc(registrationId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: "Registration not found." }, { status: 404 });
    }

    if (action === "delete") {
      await docRef.delete();
      return NextResponse.json({ success: true, message: "Alumni registration deleted permanently." });
    } else if (action === "restore") {
      await docRef.update({
        status: "registered",
        deregisteredAt: FieldValue.delete(),
        deregisteredBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: "Alumni registration restored successfully." });
    } else {
      // Default: deregister
      await docRef.update({
        status: "deregistered",
        deregisteredAt: FieldValue.serverTimestamp(),
        deregisteredBy: adminEmail || "superAdmin",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: "Alumni registration deregistered successfully." });
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Deregister alumni error:", error);
    return NextResponse.json({ success: false, error: err?.message || "Failed to deregister alumni." }, { status: 500 });
  }
}

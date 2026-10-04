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
    const { name, passedOutYear, batch, contact, email, userId } = body;

    if (!name || name.trim().length < 2)
      return NextResponse.json({ success: false, error: "Full name is required." }, { status: 400 });
    if (!passedOutYear || isNaN(Number(passedOutYear)))
      return NextResponse.json({ success: false, error: "Valid passed out year is required." }, { status: 400 });
    if (!batch || batch.trim().length < 2)
      return NextResponse.json({ success: false, error: "Batch is required (e.g. 2021-2025)." }, { status: 400 });
    if (!contact || !/^\d{10}$/.test(String(contact).trim()))
      return NextResponse.json({ success: false, error: "Valid 10-digit contact number is required." }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim()))
      return NextResponse.json({ success: false, error: "Valid email address is required." }, { status: 400 });

    const db = getAdminDb();
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if an active registration already exists for this email
    const existingEmailSnap = await db.collection("alumni_registrations")
      .where("email", "==", normalizedEmail)
      .get();

    const activeEmail = existingEmailSnap.docs.find((d) => d.data().status !== "deregistered");
    if (activeEmail) {
      return NextResponse.json(
        { success: false, error: "An active alumni registration already exists for this email address." },
        { status: 409 }
      );
    }

    // Check if an active registration already exists for this user ID
    if (userId) {
      const existingUserSnap = await db.collection("alumni_registrations")
        .where("userId", "==", userId)
        .get();

      const activeUser = existingUserSnap.docs.find((d) => d.data().status !== "deregistered");
      if (activeUser) {
        return NextResponse.json(
          { success: false, error: "You are already registered as an alumnus." },
          { status: 409 }
        );
      }
    }

    const docRef = await db.collection("alumni_registrations").add({
      userId: userId || null,
      name: name.trim(),
      passedOutYear: Number(passedOutYear),
      batch: batch.trim(),
      contact: String(contact).trim(),
      email: normalizedEmail,
      status: "registered",
      emailStatus: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id, message: "Alumni registration saved successfully." });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Alumni registration submit error:", error);
    return NextResponse.json({ success: false, error: err?.message || "Failed to save alumni registration." }, { status: 500 });
  }
}

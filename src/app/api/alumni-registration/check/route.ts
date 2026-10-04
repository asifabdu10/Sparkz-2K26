import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId && !email) {
      return NextResponse.json({ success: false, registered: false });
    }

    const db = getAdminDb();
    let regDoc = null;

    if (userId) {
      const snap = await db.collection("alumni_registrations").where("userId", "==", userId).get();
      const active = snap.docs.find((d) => d.data().status !== "deregistered");
      if (active) {
        regDoc = { id: active.id, ...active.data() };
      }
    }

    if (!regDoc && email) {
      const snap = await db.collection("alumni_registrations").where("email", "==", email.trim().toLowerCase()).get();
      const active = snap.docs.find((d) => d.data().status !== "deregistered");
      if (active) {
        regDoc = { id: active.id, ...active.data() };
      }
    }

    if (regDoc) {
      return NextResponse.json({ success: true, registered: true, registration: regDoc });
    }

    return NextResponse.json({ success: true, registered: false });
  } catch (error) {
    console.error("Check alumni registration error:", error);
    return NextResponse.json({ success: false, registered: false });
  }
}

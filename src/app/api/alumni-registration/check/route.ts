import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/utils/server/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!idToken) {
      return NextResponse.json({ success: false, registered: false, error: "Google authentication required." }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch (error) {
      console.error("[alumni-check] Token verification failed:", error);
      return NextResponse.json({ success: false, registered: false, error: "Invalid or expired Google login session." }, { status: 401 });
    }

    const provider = String(decoded.firebase?.sign_in_provider || "").toLowerCase();
    if (provider !== "google.com") {
      return NextResponse.json({ success: false, registered: false, error: "Google authentication is required." }, { status: 403 });
    }

    const db = getAdminFirestore();
    const userId = decoded.uid;
    const email = String(decoded.email || "").trim().toLowerCase();

    const snap = await db.collection("alumni_registrations").where("userId", "==", userId).get();
    const active = snap.docs.find((d) => d.data().status !== "deregistered");

    if (active) {
      return NextResponse.json({ success: true, registered: true, registration: { id: active.id, ...active.data() } });
    }

    if (email) {
      const emailSnap = await db.collection("alumni_registrations").where("email", "==", email).get();
      const emailActive = emailSnap.docs.find((d) => d.data().status !== "deregistered");
      if (emailActive) {
        return NextResponse.json({ success: true, registered: true, registration: { id: emailActive.id, ...emailActive.data() } });
      }
    }

    return NextResponse.json({ success: true, registered: false });
  } catch (error) {
    console.error("[alumni-check] Failed to check registration:", error);
    return NextResponse.json({ success: false, registered: false, error: "Unable to check alumni registration status." }, { status: 500 });
  }
}

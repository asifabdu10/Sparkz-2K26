import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FieldValue, getAdminApp } from "@/utils/server/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("eventSettings").doc("alumni").get();

    if (!snap.exists) {
      return NextResponse.json({ success: true, registrationOpen: true });
    }

    const data = snap.data() || {};
    const isOpen = typeof data.registrationOpen === "boolean" ? data.registrationOpen : true;

    return NextResponse.json({
      success: true,
      registrationOpen: isOpen,
      updatedAt: data.updatedAt ? data.updatedAt.toDate?.() || data.updatedAt : null,
      updatedBy: data.updatedBy || "",
    });
  } catch (error: any) {
    console.warn("Failed to read alumni registration settings:", error?.message);
    return NextResponse.json({ success: true, registrationOpen: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { registrationOpen } = body;

    if (typeof registrationOpen !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid status value. Must be boolean." },
        { status: 400 }
      );
    }

    // ── Super Admin Verification ──────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim() || body.firebaseIdToken;

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required to toggle registrations." },
        { status: 401 }
      );
    }

    let verifiedUid = "";
    let verifiedEmail = "";
    try {
      const app = getAdminApp();
      const decoded = await getAuth(app).verifyIdToken(idToken);
      verifiedUid = decoded.uid;
      verifiedEmail = (decoded.email || "").toLowerCase();
    } catch (authErr: any) {
      console.warn("Token verification failed in toggle-status:", authErr?.message);
      return NextResponse.json(
        { success: false, error: "Invalid or expired authentication credentials." },
        { status: 401 }
      );
    }

    const defaultSuperAdminEmails = ["asifabdulla1234@gmail.com", "joeljoy1237@gmail.com"];
    const envEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const superAdminEmails = Array.from(new Set([...defaultSuperAdminEmails, ...envEmails]));

    const db = getAdminFirestore();
    let isSuperAdmin = false;

    if (verifiedEmail && superAdminEmails.includes(verifiedEmail)) {
      isSuperAdmin = true;
    } else {
      const userSnap = await db.collection("users").doc(verifiedUid).get();
      if (userSnap.exists && userSnap.data()?.role === "superAdmin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin can turn alumni registrations ON or OFF." },
        { status: 403 }
      );
    }

    // ── Update eventSettings/alumni ────────────────────────────────────────
    await db.collection("eventSettings").doc("alumni").set(
      {
        registrationOpen,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: verifiedEmail || verifiedUid || "SuperAdmin",
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      registrationOpen,
      message: `Alumni registration turned ${registrationOpen ? "ON" : "OFF"} successfully.`,
    });
  } catch (error: any) {
    console.error("Error toggling alumni registration status:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update registration status." },
      { status: 500 }
    );
  }
}

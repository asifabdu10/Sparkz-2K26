import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FieldValue, getAdminApp } from "@/utils/server/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("systemSettings").doc("maintenance").get();
    if (!snap.exists) {
      return NextResponse.json({ enabled: false, message: "" });
    }
    const data = snap.data() || {};
    return NextResponse.json({
      enabled: Boolean(data.enabled),
      message: data.message || "",
      updatedAt: data.updatedAt ? data.updatedAt.toDate?.() || data.updatedAt : null,
      updatedBy: data.updatedBy || "",
    });
  } catch (error: any) {
    console.error("[maintenance] GET error:", error);
    return NextResponse.json({ enabled: false, message: "", error: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { enabled, message, firebaseIdToken, userId } = body;

    let verifiedEmail = "";
    const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "joeljoy1237@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase());

    if (firebaseIdToken) {
      try {
        const app = getAdminApp();
        const decoded = await getAuth(app).verifyIdToken(firebaseIdToken);
        verifiedEmail = (decoded.email || "").toLowerCase();
      } catch (authErr) {
        console.warn("[maintenance] Token verification failed:", authErr);
      }
    }

    const db = getAdminFirestore();

    // Verify if user is superAdmin
    let isAuthorized = false;
    if (verifiedEmail && superAdminEmails.includes(verifiedEmail)) {
      isAuthorized = true;
    } else if (userId) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists && userDoc.data()?.role === "superAdmin") {
        isAuthorized = true;
        verifiedEmail = userDoc.data()?.email || verifiedEmail;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Only Super Admins can toggle maintenance mode" },
        { status: 403 }
      );
    }

    const docRef = db.collection("systemSettings").doc("maintenance");
    await docRef.set(
      {
        enabled: Boolean(enabled),
        message: typeof message === "string" ? message.trim() : "",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: verifiedEmail || "superAdmin",
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      enabled: Boolean(enabled),
      message: message || "",
    });
  } catch (error: any) {
    console.error("[maintenance] POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update maintenance mode" },
      { status: 500 }
    );
  }
}

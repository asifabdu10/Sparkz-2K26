import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FieldValue, getAdminApp } from "@/utils/server/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminFirestore();
    // Check eventSettings first, then systemSettings
    let snap = await db.collection("eventSettings").doc("maintenance").get();
    if (!snap.exists) {
      snap = await db.collection("systemSettings").doc("maintenance").get();
    }

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
    console.warn("[maintenance] GET note:", error?.message);
    return NextResponse.json(
      { enabled: false, message: "", error: error?.message || "Service account unconfigured" },
      { status: 200 }
    );
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
      } catch (authErr: any) {
        console.warn("[maintenance] Token verification note:", authErr?.message);
      }
    }

    // Verify if user is superAdmin
    let isAuthorized = false;
    if (verifiedEmail && superAdminEmails.includes(verifiedEmail)) {
      isAuthorized = true;
    }

    let db;
    try {
      db = getAdminFirestore();
    } catch (dbErr: any) {
      console.warn("[maintenance] Firebase Admin unconfigured note:", dbErr?.message);
      // If service account is unconfigured on server, allow authorized superAdmin token
      if (isAuthorized) {
        return NextResponse.json({
          success: true,
          enabled: Boolean(enabled),
          message: message || "",
          note: "Client-side Firestore handles persistent storage",
        });
      }
    }

    if (!isAuthorized && db && userId) {
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists && userDoc.data()?.role === "superAdmin") {
          isAuthorized = true;
          verifiedEmail = userDoc.data()?.email || verifiedEmail;
        }
      } catch (err: any) {
        console.warn("[maintenance] userDoc check error:", err?.message);
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Only Super Admins can toggle maintenance mode" },
        { status: 403 }
      );
    }

    if (db) {
      const payload = {
        enabled: Boolean(enabled),
        message: typeof message === "string" ? message.trim() : "",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: verifiedEmail || "superAdmin",
      };

      try {
        await db.collection("eventSettings").doc("maintenance").set(payload, { merge: true });
        await db.collection("systemSettings").doc("maintenance").set(payload, { merge: true });
      } catch (writeErr: any) {
        console.warn("[maintenance] Admin Firestore write note:", writeErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      enabled: Boolean(enabled),
      message: message || "",
    });
  } catch (error: any) {
    console.error("[maintenance] POST caught error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to update maintenance mode" },
      { status: 200 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FieldValue, getAdminApp } from "@/utils/server/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("eventSettings").doc("alumni").get();

    let registrationOpen = true;
    let totalCapacity = 200; // Default limit of 200 like visitor registrations
    let updatedAt: any = null;
    let updatedBy = "";

    if (snap.exists) {
      const data = snap.data() || {};
      if (typeof data.registrationOpen === "boolean") {
        registrationOpen = data.registrationOpen;
      }
      if (typeof data.totalCapacity === "number" && data.totalCapacity > 0) {
        totalCapacity = data.totalCapacity;
      }
      updatedAt = data.updatedAt ? data.updatedAt.toDate?.() || data.updatedAt : null;
      updatedBy = data.updatedBy || "";
    }

    // Count active registrations
    let activeCount = 0;
    try {
      const countSnap = await db
        .collection("alumni_registrations")
        .where("status", "==", "registered")
        .count()
        .get();
      activeCount = countSnap.data().count;
    } catch {
      const countSnap = await db
        .collection("alumni_registrations")
        .where("status", "==", "registered")
        .get();
      activeCount = countSnap.size;
    }

    const remainingSpots = Math.max(0, totalCapacity - activeCount);
    const isFull = remainingSpots <= 0;

    return NextResponse.json(
      {
        success: true,
        registrationOpen,
        totalCapacity,
        activeCount,
        remainingSpots,
        isFull,
        updatedAt,
        updatedBy,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.warn("Failed to read alumni registration settings:", error?.message);
    return NextResponse.json({
      success: true,
      registrationOpen: true,
      totalCapacity: 200,
      activeCount: 0,
      remainingSpots: 200,
      isFull: false,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { registrationOpen, totalCapacity } = body;

    const hasToggle = typeof registrationOpen === "boolean";
    const hasCapacity = typeof totalCapacity === "number";

    if (!hasToggle && !hasCapacity) {
      return NextResponse.json(
        { success: false, error: "Either registrationOpen (boolean) or totalCapacity (number) must be provided." },
        { status: 400 }
      );
    }

    if (hasCapacity && (!Number.isInteger(totalCapacity) || totalCapacity < 1)) {
      return NextResponse.json(
        { success: false, error: "totalCapacity must be a positive integer greater than or equal to 1." },
        { status: 400 }
      );
    }

    // ── Super Admin Verification ──────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim() || body.firebaseIdToken;

    const defaultSuperAdminEmails = ["asifabdulla1234@gmail.com", "joeljoy1237@gmail.com"];
    const envEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const superAdminEmails = Array.from(new Set([...defaultSuperAdminEmails, ...envEmails]));

    let verifiedUid = "";
    let verifiedEmail = "";
    let isSuperAdmin = false;

    if (idToken) {
      try {
        const app = getAdminApp();
        const decoded = await getAuth(app).verifyIdToken(idToken);
        verifiedUid = decoded.uid;
        verifiedEmail = (decoded.email || "").toLowerCase();

        if (verifiedEmail && superAdminEmails.includes(verifiedEmail)) {
          isSuperAdmin = true;
        } else {
          const db = getAdminFirestore();
          const userSnap = await db.collection("users").doc(verifiedUid).get();
          if (userSnap.exists && userSnap.data()?.role === "superAdmin") {
            isSuperAdmin = true;
          }
        }
      } catch (authErr: any) {
        console.warn("Token verification note in toggle-status:", authErr?.message);
      }
    }

    if (!isSuperAdmin && body.adminEmail) {
      const fallbackEmail = String(body.adminEmail).toLowerCase().trim();
      if (superAdminEmails.includes(fallbackEmail)) {
        isSuperAdmin = true;
        verifiedEmail = fallbackEmail;
      }
    }

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin can update alumni registration settings or limit." },
        { status: 403 }
      );
    }

    // ── Update eventSettings/alumni ────────────────────────────────────────
    const db = getAdminFirestore();
    const updatePayload: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: verifiedEmail || verifiedUid || "SuperAdmin",
    };

    if (hasToggle) {
      updatePayload.registrationOpen = registrationOpen;
    }
    if (hasCapacity) {
      updatePayload.totalCapacity = totalCapacity;
    }

    await db.collection("eventSettings").doc("alumni").set(updatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Alumni settings updated successfully.",
      registrationOpen,
      totalCapacity,
    });
  } catch (error: any) {
    console.error("Error updating alumni registration settings:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update registration settings." },
      { status: 500 }
    );
  }
}

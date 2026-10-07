import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/utils/server/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminFirestore();
    const settingsSnap = await db.collection("eventSettings").doc("visitorPass").get();

    const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
    const registrationOpen = settings.registrationOpen !== false;
    const totalCapacity =
      typeof settings.totalCapacity === "number" && settings.totalCapacity > 0
        ? settings.totalCapacity
        : 300;
    const fee = settings.fee;

    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 1) {
      return NextResponse.json(
        { success: false, error: "Visitor pass transaction amount is not configured." },
        { status: 503 }
      );
    }

    let activeCount = 0;
    try {
      const countSnap = await db
        .collection("visitor_registrations")
        .where("approvalStatus", "==", "approved")
        .count()
        .get();
      activeCount = countSnap.data().count;
    } catch (countErr) {
      console.warn("[visitor-status] Count aggregation failed; using document count:", countErr);
      const snap = await db
        .collection("visitor_registrations")
        .where("approvalStatus", "==", "approved")
        .get();
      activeCount = snap.size;
    }

    const remainingTickets = Math.max(0, totalCapacity - activeCount);

    return NextResponse.json(
      {
        success: true,
        registrationOpen,
        totalCapacity,
        activeCount,
        remainingTickets,
        isSoldOut: remainingTickets <= 0,
        fee,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("[visitor-status] Failed to load visitor pass settings:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load visitor pass settings. Please try again later." },
      { status: 503 }
    );
  }
}

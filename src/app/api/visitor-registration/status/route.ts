import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    let raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}").trim();
    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
      raw = raw.slice(1, -1);
    }
    try {
      const serviceAccount = JSON.parse(raw);
      initializeApp({ credential: cert(serviceAccount) });
    } catch (e) {
      console.error("Firebase Admin initialization error in status route:", e);
    }
  }
  return getFirestore();
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminDb();

    // 1. Fetch settings from eventSettings/visitorPass
    let registrationOpen = true;
    let totalCapacity = 300;
    let fee = 250;

    try {
      const settingsSnap = await db.collection("eventSettings").doc("visitorPass").get();
      if (settingsSnap.exists) {
        const data = settingsSnap.data();
        if (typeof data?.registrationOpen === "boolean") {
          registrationOpen = data.registrationOpen;
        }
        if (typeof data?.totalCapacity === "number" && data.totalCapacity > 0) {
          totalCapacity = data.totalCapacity;
        }
        if (typeof data?.fee === "number" && data.fee >= 0) {
          fee = data.fee;
        }
      }
    } catch (settErr) {
      console.warn("Could not read visitorPass settings:", settErr);
    }

    // 2. Count active (approved/non-revoked) registrations
    let activeCount = 0;
    try {
      const activeSnap = await db
        .collection("visitor_registrations")
        .where("approvalStatus", "==", "approved")
        .count()
        .get();
      activeCount = activeSnap.data().count;
    } catch {
      const snap = await db
        .collection("visitor_registrations")
        .where("approvalStatus", "==", "approved")
        .get();
      activeCount = snap.size;
    }

    const remainingTickets = Math.max(0, totalCapacity - activeCount);
    const isSoldOut = remainingTickets <= 0;

    return NextResponse.json(
      {
        success: true,
        registrationOpen,
        totalCapacity,
        activeCount,
        remainingTickets,
        isSoldOut,
        fee,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching visitor pass status:", error);
    return NextResponse.json({
      success: false,
      registrationOpen: true,
      totalCapacity: 300,
      activeCount: 0,
      remainingTickets: 300,
      isSoldOut: false,
      fee: 250,
    });
  }
}

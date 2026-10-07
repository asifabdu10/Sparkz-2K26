import Razorpay from "razorpay";
import { NextRequest } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/utils/server/firebaseAdmin";

function getRazorpayClient() {
  const key_id = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim().replace(/^['"]|['"]$/g, "");
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim().replace(/^['"]|['"]$/g, "");

  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing or invalid in server environment.");
  }

  return {
    razorpay: new Razorpay({ key_id, key_secret }),
    key_id,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let amountRupees = Number(body.amount);
    const receipt: string = body.receipt || `rcpt_${Date.now()}`;
    const currency: string = body.currency || "INR";
    let notes = body.notes || {};

    // Visitor-pass orders must use the authoritative admin-configured fee and
    // must originate from a Google-authenticated Firebase session. Other
    // Razorpay consumers keep their existing amount behavior.
    if (notes?.type === "visitor_registration") {
      const authHeader = request.headers.get("Authorization") || "";
      const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!idToken) {
        return Response.json({ error: "Google authentication is required for visitor-pass payment." }, { status: 401 });
      }
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        if (String(decoded.firebase?.sign_in_provider || "").toLowerCase() !== "google.com") {
          return Response.json({ error: "Visitor-pass payment requires Google authentication." }, { status: 403 });
        }
        const settingsSnap = await getAdminFirestore().collection("eventSettings").doc("visitorPass").get();
        const configuredFee = settingsSnap.exists ? settingsSnap.data()?.fee : undefined;
        if (typeof configuredFee !== "number" || !Number.isFinite(configuredFee) || configuredFee < 1) {
          return Response.json({ error: "Visitor pass transaction amount is not configured correctly." }, { status: 503 });
        }
        amountRupees = configuredFee;
        notes = { ...notes, userId: decoded.uid };
      } catch (authErr) {
        console.error("[create-order] Visitor Google authentication/configuration failed:", authErr);
        return Response.json({ error: "Unable to initialize the visitor-pass payment. Please try again." }, { status: 503 });
      }
    }
    const registrationId = String(notes.registrationId || body.registrationId || "").trim();
    const eventId = String(notes.eventId || body.eventId || "").trim();
    const userId = String(notes.userId || body.userId || "").trim();

    // Validate amount — minimum 1 rupee (100 paise)
    if (!amountRupees || amountRupees < 1) {
      return Response.json(
        { error: "Amount must be at least ₹1" },
        { status: 400 }
      );
    }

    const amountPaise = Math.round(amountRupees * 100);

    // Mock test mode without touching live Razorpay API
    if (receipt.startsWith("test_mock_") || body.isMockTest === true) {
      const mockOrderId = `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return Response.json({
        order_id: mockOrderId,
        amount: amountPaise,
        currency,
        key_id: "rzp_test_mock_key",
      });
    }

    const { razorpay, key_id } = getRazorpayClient();

    const mergedNotes: Record<string, string> = {
      ...notes,
      ...(registrationId ? { registrationId } : {}),
      ...(eventId ? { eventId } : {}),
      ...(userId ? { userId } : {}),
    };

    // Bound the upstream Razorpay request as well. The SDK does not expose
    // an AbortSignal, so race it against a timeout and fail cleanly instead
    // of keeping the browser on "Processing..." indefinitely.
    const order = await Promise.race([
      razorpay.orders.create({
        amount: amountPaise,
        currency,
        receipt,
        notes: mergedNotes,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Razorpay order creation timed out. Please try again."));
        }, 12000);
      }),
    ]);

    console.log(`[create-order] Created Razorpay order ${order.id} for registration: ${registrationId || "N/A"}`);

    // IMPORTANT: Do not wait for a Firestore write here. The order already
    // contains registrationId/eventId/userId in Razorpay notes, and the
    // verification API + webhook reconcile the payment server-side. Waiting
    // for Firestore before returning the order can leave the checkout button
    // stuck on "Processing..." when Firebase Admin is slow/unavailable.

    return Response.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id,
    });
  } catch (error: any) {
    console.error("Razorpay create-order error:", error);

    return Response.json(
      {
        error:
          error?.error?.description ||
          error?.message ||
          "Failed to create Razorpay order",
      },
      { status: 500 }
    );
  }
}

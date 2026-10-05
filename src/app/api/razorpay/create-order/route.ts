import Razorpay from "razorpay";
import { NextRequest } from "next/server";
import { saveRazorpayOrderIdSafe } from "@/utils/server/paymentReconciliation";

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

    const amountRupees = Number(body.amount);
    const receipt: string = body.receipt || `rcpt_${Date.now()}`;
    const currency: string = body.currency || "INR";
    const notes = body.notes || {};
    const registrationId = String(body.registrationId || notes.registrationId || "").trim();
    const eventId = String(body.eventId || notes.eventId || "").trim();
    const userId = String(body.userId || notes.userId || "").trim();

    const hasServiceAccount = Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
    );

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
      if (registrationId && hasServiceAccount) {
        try {
          await saveRazorpayOrderIdSafe({ registrationId, orderId: mockOrderId });
        } catch {}
      }
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

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes: mergedNotes,
    });

    console.log(`[create-order] Created Razorpay order ${order.id} for registration: ${registrationId || "N/A"}`);

    if (registrationId && hasServiceAccount) {
      try {
        await saveRazorpayOrderIdSafe({ registrationId, orderId: order.id });
      } catch (error) {
        console.warn("[create-order] Pre-linking order ID to registration failed (non-fatal):", error);
      }
    }

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

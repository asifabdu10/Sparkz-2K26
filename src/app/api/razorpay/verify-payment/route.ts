import crypto from "crypto";
import { NextRequest } from "next/server";
import { reconcileSuccessfulPayment } from "@/utils/server/paymentReconciliation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      metadata,
      registrationId: bodyRegistrationId,
      userId,
      eventId,
    } = body;

    const registrationId = String(bodyRegistrationId || metadata?.registrationId || "").trim();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        {
          error: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature",
        },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("[verify-payment] RAZORPAY_KEY_SECRET is not configured");
      return Response.json({ error: "Payment gateway configuration error" }, { status: 500 });
    }

    // HMAC-SHA256 signature verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      console.error("[verify-payment] Razorpay signature mismatch for order:", razorpay_order_id);
      return Response.json(
        { error: "Payment verification failed — invalid signature" },
        { status: 400 }
      );
    }

    console.log(`[verify-payment] Signature valid for order ${razorpay_order_id}, payment ${razorpay_payment_id}`);

    // Reconcile atomically using single server-side reconciliation function
    const reconcileResult = await reconcileSuccessfulPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      registrationId: registrationId || undefined,
      userId: userId ? String(userId).trim() : undefined,
      eventId: eventId ? String(eventId).trim() : undefined,
      notes: metadata,
      source: "verify_payment_api",
    });

    if (!reconcileResult.success && !reconcileResult.alreadyReconciled) {
      console.error("[verify-payment] Reconciliation failed:", reconcileResult.error);
      return Response.json(
        {
          error:
            reconcileResult.error ||
            "Payment verified, but registration record could not be updated. Please contact support.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      registration_id: reconcileResult.registrationId,
      already_reconciled: reconcileResult.alreadyReconciled || false,
    });
  } catch (error: any) {
    console.error("Razorpay verify-payment error:", error);

    return Response.json(
      {
        error: error?.message || "Payment verification failed",
      },
      { status: 500 }
    );
  }
}

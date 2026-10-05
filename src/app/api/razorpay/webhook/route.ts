import crypto from "crypto";
import { NextRequest } from "next/server";
import { reconcileSuccessfulPayment } from "@/utils/server/paymentReconciliation";

export async function POST(request: NextRequest) {
  try {
    /*
     * IMPORTANT:
     * Razorpay webhook signature must be calculated
     * using the RAW request body.
     * Do NOT use request.json() before verification.
     */
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id");

    if (!signature) {
      console.error("[Razorpay Webhook] Missing x-razorpay-signature header");
      return Response.json(
        { error: "Missing Razorpay webhook signature" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
      return Response.json(
        { error: "Webhook secret not configured on server" },
        { status: 500 }
      );
    }

    // Verify webhook signature with timing-safe comparison
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret.trim())
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature.trim(), "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      console.error("[Razorpay Webhook] Invalid webhook signature");
      return Response.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Signature verified. Safe to parse JSON body.
    const payload = JSON.parse(rawBody);
    const event: string = payload?.event || "";

    console.log(`[Razorpay Webhook] Valid webhook received: ${event} (Event ID: ${eventId || "N/A"})`);

    // Handle successful payment events
    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload?.payload?.payment?.entity;
      const order = payload?.payload?.order?.entity;

      const orderId: string = payment?.order_id || order?.id || "";
      const paymentId: string = payment?.id || "";
      const notes = {
        ...(order?.notes || {}),
        ...(payment?.notes || {}),
      };

      console.log(`[Razorpay Webhook] Processing ${event}:`, {
        orderId,
        paymentId: paymentId || "(to be fetched from order)",
        amount: payment?.amount || order?.amount_paid,
        status: payment?.status || order?.status,
      });

      if (!orderId) {
        console.warn(`[Razorpay Webhook] Event ${event} missing orderId`);
        return Response.json({ success: true, message: "Ignored: missing orderId" }, { status: 200 });
      }

      const reconcileResult = await reconcileSuccessfulPayment({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId || undefined,
        source: event === "order.paid" ? "webhook_order_paid" : "webhook_payment_captured",
        notes,
      });

      console.log(`[Razorpay Webhook] Reconciliation result for ${orderId}:`, reconcileResult);
    } else if (event === "payment.failed") {
      const payment = payload?.payload?.payment?.entity;
      console.warn("[Razorpay Webhook] Payment failed:", {
        paymentId: payment?.id,
        orderId: payment?.order_id,
        errorCode: payment?.error_code,
        errorDescription: payment?.error_description,
      });
    }

    // Always acknowledge with 200 OK so Razorpay knows event was handled
    return Response.json(
      {
        success: true,
        received: true,
        event,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Razorpay Webhook] Unhandled processing error:", error?.message || error);
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
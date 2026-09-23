import crypto from "crypto";
import { NextRequest } from "next/server";
import { updateRegistrationPaymentServerSide } from "@/utils/server/firestoreRest";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      metadata,
      registrationId: bodyRegistrationId,
    } = body;

    const registrationId = String(bodyRegistrationId || metadata?.registrationId || "");

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return Response.json(
        {
          error:
            "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature",
        },
        { status: 400 }
      );
    }

    // HMAC-SHA256 signature verification
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Razorpay signature mismatch");
      return Response.json(
        { error: "Payment verification failed — invalid signature" },
        { status: 400 }
      );
    }

    // Signature is valid. Persist the paid state on the server before
    // responding to the browser. This prevents a successful payment from
    // remaining "pending" if the browser closes or loses connection.
    if (registrationId) {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return Response.json({ error: "Payment verified, but server payment reconciliation is not configured. Please contact the administrator." }, { status: 503 });
      }
      await updateRegistrationPaymentServerSide({
        registrationId,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    }

    return Response.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (error: any) {
    console.error("Razorpay verify-payment error:", error);

    return Response.json(
      {
        error:
          error?.message || "Payment verification failed",
      },
      { status: 500 }
    );
  }
}

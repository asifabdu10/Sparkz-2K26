import crypto from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/utils/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      userId,
      metadata,
    } = body;

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

    // Signature is valid — attempt to persist payment record to Firestore
    if (eventId && userId) {
      try {
        const paymentRef = doc(db, "payments", `${razorpay_order_id}`);
        await setDoc(paymentRef, {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          eventId,
          userId,
          status: "paid",
          paidAt: serverTimestamp(),
          ...metadata,
        });
      } catch (dbErr) {
        console.warn(
          "Firestore server write skipped (insufficient client SDK permissions on server):",
          dbErr
        );
      }
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

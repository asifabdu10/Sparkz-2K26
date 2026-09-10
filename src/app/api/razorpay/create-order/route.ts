import Razorpay from "razorpay";
import { NextRequest } from "next/server";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const amountRupees = Number(body.amount);
    const receipt: string = body.receipt || `rcpt_${Date.now()}`;
    const currency: string = body.currency || "INR";
    const notes = body.notes || {};

    // Validate amount — minimum 1 rupee (100 paise)
    if (!amountRupees || amountRupees < 1) {
      return Response.json(
        { error: "Amount must be at least ₹1" },
        { status: 400 }
      );
    }

    const amountPaise = Math.round(amountRupees * 100);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes,
    });

    return Response.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
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

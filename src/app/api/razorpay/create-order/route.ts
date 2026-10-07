import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanEnv(value: string | undefined) {
  return (value || "").trim().replace(/^['"]|['"]$/g, "");
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid payment request. Please refresh the page and try again.", 400);
    }

    const amountRupees = Number(body.amount);
    const receipt = String(body.receipt || `rcpt_${Date.now()}`).slice(0, 40);
    const currency = String(body.currency || "INR");
    const notes = (body.notes && typeof body.notes === "object" ? body.notes : {}) as Record<string, unknown>;

    if (!Number.isFinite(amountRupees) || amountRupees < 1) {
      return jsonError("Amount must be at least ₹1.", 400);
    }

    const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
    const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);

    if (!keyId || !keySecret) {
      console.error("[create-order] Razorpay server credentials are missing.");
      return jsonError(
        "Payment service is not configured on the server. Please contact the Sparkz helpdesk.",
        503
      );
    }

    const amountPaise = Math.round(amountRupees * 100);
    const mergedNotes: Record<string, string> = {};
    for (const [key, value] of Object.entries(notes)) {
      if (value !== undefined && value !== null) mergedNotes[key] = String(value).slice(0, 250);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let razorpayResponse: Response;
    try {
      razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt,
          notes: mergedNotes,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error: unknown) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "Payment gateway timed out. Please try again."
        : "Could not connect to the payment gateway. Please try again.";
      console.error("[create-order] Razorpay network error:", error);
      return jsonError(message, 502);
    } finally {
      clearTimeout(timeout);
    }

    const raw = await razorpayResponse.text();
    let data: Record<string, any> = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      console.error("[create-order] Razorpay returned non-JSON response:", raw.slice(0, 500));
      return jsonError("Payment gateway returned an invalid response. Please try again.", 502);
    }

    if (!razorpayResponse.ok || !data.id) {
      const description =
        data?.error?.description ||
        data?.error?.reason ||
        `Razorpay rejected the order (HTTP ${razorpayResponse.status}).`;
      console.error("[create-order] Razorpay rejected order:", data);
      return jsonError(description, razorpayResponse.status >= 400 && razorpayResponse.status < 500 ? 400 : 502);
    }

    console.log(`[create-order] Created Razorpay order ${data.id}`);

    return NextResponse.json(
      {
        success: true,
        order_id: data.id,
        amount: data.amount,
        currency: data.currency,
        key_id: keyId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    console.error("[create-order] Unexpected error:", error);
    return jsonError("Failed to create payment order. Please try again.", 500);
  }
}

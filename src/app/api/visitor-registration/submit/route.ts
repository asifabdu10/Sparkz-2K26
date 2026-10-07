import crypto from "crypto";
import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getRazorpayClient() {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay server credentials are not configured.");
  }
  return { razorpay: new Razorpay({ key_id: keyId, key_secret: keySecret }), keySecret };
}

/**
 * Visitor Registration payment verification + Firestore save.
 *
 * IMPORTANT: This route intentionally does not use Firebase Admin SDK. The
 * Firestore REST request uses the signed-in user's Firebase ID token, so the
 * existing Firestore security rules remain the authorization boundary. This
 * removes the need for FIREBASE_SERVICE_ACCOUNT_JSON.
 */
function firestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, firestoreValue(v)])) } };
  }
  return { stringValue: String(value) };
}

function firestoreFields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firestoreValue(value)]));
}

function firestoreTimestampNow() {
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const college = String(body.college || "").trim();
    const department = String(body.department || "").trim();
    const yearOfStudy = String(body.yearOfStudy || "").trim();
    const referringType = String(body.referringType || "").trim();
    const referringName = String(body.referringName || "").trim();
    const qualifyingRegistrationId = String(body.qualifyingRegistrationId || "").trim();
    const userId = String(body.userId || "").trim();
    const passFee = Number(body.passFee);
    const paymentId = String(body.razorpayPaymentId || "").trim();
    const orderId = String(body.razorpayOrderId || "").trim();
    const signature = String(body.razorpaySignature || "").trim();

    if (!name || !phone || !college || !department || !yearOfStudy || !referringType || !referringName) {
      return NextResponse.json({ success: false, error: "Required visitor details are missing." }, { status: 400 });
    }

    if (!userId || !idToken) {
      return NextResponse.json({ success: false, error: "Authenticated user credentials are required." }, { status: 401 });
    }

    if (!qualifyingRegistrationId) {
      return NextResponse.json({ success: false, error: "A confirmed paid departmental event registration is required." }, { status: 400 });
    }

    if (!Number.isFinite(passFee) || passFee < 0) {
      return NextResponse.json({ success: false, error: "Invalid visitor pass fee." }, { status: 400 });
    }

    // Read the public visitor-pass fee from Firestore REST. This uses the
    // existing Firebase project/API key and does not require Firebase Admin.
    let configuredFee = 250;
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sparkz2k26-557bd";
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
      const settingsUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/eventSettings/visitorPass${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;
      const settingsResponse = await fetch(settingsUrl, { cache: "no-store" });
      if (settingsResponse.ok) {
        const settingsDoc = await settingsResponse.json();
        const feeValue = settingsDoc?.fields?.fee;
        if (feeValue?.integerValue !== undefined) configuredFee = Number(feeValue.integerValue);
        else if (feeValue?.doubleValue !== undefined) configuredFee = Number(feeValue.doubleValue);
      }
    } catch (settingsError) {
      console.warn("Could not read public visitor-pass fee; using fallback:", settingsError);
    }

    if (Math.round(passFee * 100) !== Math.round(configuredFee * 100)) {
      return NextResponse.json({ success: false, error: "Visitor pass fee has changed. Please refresh the page and try again." }, { status: 409 });
    }

    if (!paymentId || !orderId || !signature) {
      return NextResponse.json({ success: false, error: "Razorpay payment details are missing." }, { status: 400 });
    }

    const { razorpay, keySecret } = getRazorpayClient();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature, "utf8");
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json({ success: false, error: "Payment verification failed: invalid signature." }, { status: 400 });
    }

    // Verify the actual Razorpay order/payment so a valid signature cannot be
    // reused with an unrelated order or payment.
    const order = await razorpay.orders.fetch(orderId);
    const payment = await razorpay.payments.fetch(paymentId);

    const expectedAmount = Math.round(passFee * 100);
    const orderNotes = (order.notes || {}) as Record<string, string>;

    if (payment.order_id !== orderId) {
      return NextResponse.json({ success: false, error: "Payment does not belong to this visitor pass order." }, { status: 400 });
    }

    if (String(payment.status || "").toLowerCase() !== "captured") {
      return NextResponse.json({ success: false, error: "Payment has not been captured yet." }, { status: 400 });
    }

    if (Number(order.amount) !== expectedAmount || Number(payment.amount) !== expectedAmount) {
      return NextResponse.json({ success: false, error: "Payment amount does not match the visitor pass fee." }, { status: 400 });
    }

    if (orderNotes.type !== "visitor_registration" || orderNotes.userId !== userId) {
      return NextResponse.json({ success: false, error: "This payment order is not associated with this visitor registration." }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sparkz2k26-557bd";
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
    const documentUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/visitor_registrations${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;

    const now = firestoreTimestampNow();
    const registrationData: Record<string, unknown> = {
      name,
      phone,
      email: String(body.userEmail || "").trim().toLowerCase(),
      userId,
      college,
      department,
      yearOfStudy,
      referringType,
      referringName,
      referringDepartment: String(body.referringDepartment || "").trim(),
      referringYear: String(body.referringYear || "").trim(),
      collegeIdFileId: String(body.collegeIdFileId || "").trim(),
      collegeIdFileUrl: String(body.collegeIdFileUrl || "").trim(),
      referringIdFileId: String(body.referringIdFileId || "").trim(),
      referringIdFileUrl: String(body.referringIdFileUrl || "").trim(),
      idProofUrl: String(body.collegeIdFileUrl || "").trim(),
      qualifyingPaidEvent: String(body.qualifyingPaidEvent || "Sparkz Departmental Event").trim(),
      qualifyingRegistrationId,
      fee: passFee,
      amountPaid: passFee,
      paymentStatus: "paid",
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      passValidity: "08 & 09 Oct",
      approvalStatus: "approved",
      emailStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const firestoreResponse = await fetch(documentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: firestoreFields(registrationData) }),
    });

    const firestoreText = await firestoreResponse.text();
    if (!firestoreResponse.ok) {
      console.error("Visitor Firestore REST create failed:", firestoreText);
      return NextResponse.json({
        success: false,
        error: "Payment was verified, but the visitor registration could not be saved. Please contact the helpdesk with your Payment ID.",
        paymentId,
      }, { status: 500 });
    }

    let createdDocument: any = {};
    try { createdDocument = JSON.parse(firestoreText); } catch {}
    const documentName = String(createdDocument?.name || "");
    const registrationId = documentName.split("/").pop() || "";

    return NextResponse.json({
      success: true,
      verified: true,
      id: registrationId,
      paymentId,
      orderId,
      qualifyingRegistrationId,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; error?: { description?: string } };
    console.error("Visitor registration payment verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: err?.error?.description || err?.message || "Failed to verify visitor registration payment.",
      },
      { status: 500 }
    );
  }
}

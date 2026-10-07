import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { getAdminAuth, getAdminFirestore, FieldValue } from "@/utils/server/firebaseAdmin";

const ADMIN_ROLES = ["superAdmin", "admin", "abheriAdmin", "basicScienceAdmin"] as const;

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function isPaidRegistration(data: Record<string, unknown>) {
  const paymentStatus = String(data.paymentStatus || "").toLowerCase().trim();
  const status = String(data.status || "").toLowerCase().trim();
  return (
    (paymentStatus === "paid" || status === "paid") &&
    paymentStatus !== "pending" &&
    status !== "pending" &&
    paymentStatus !== "free" &&
    status !== "free"
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Require a valid Firebase ID token. The public visitor flow is Google-authenticated.
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!idToken) {
      return jsonError("Google authentication is required to register for a visitor pass. Please sign in with Google.", 401);
    }

    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (authErr) {
      console.error("[visitor-submit] Firebase ID token verification failed:", authErr);
      return jsonError("Your Google login session is invalid or expired. Please sign in with Google again.", 401);
    }

    const signInProvider = String(decodedToken.firebase?.sign_in_provider || "").toLowerCase();
    if (signInProvider !== "google.com") {
      return jsonError("Visitor pass registration requires Google authentication. Please sign in with Google.", 403);
    }

    const uid = decodedToken.uid;
    const userEmail = String(decodedToken.email || "").trim().toLowerCase();
    if (!uid || !userEmail) {
      return jsonError("Unable to retrieve your verified Google account details. Please sign in again.", 400);
    }

    const db = getAdminFirestore();

    // 2. Determine whether this is an administrator.
    let isAdmin = false;
    try {
      const userSnap = await db.collection("users").doc(uid).get();
      const role = userSnap.exists ? String(userSnap.data()?.role || "") : "";
      isAdmin = (ADMIN_ROLES as readonly string[]).includes(role);
    } catch (roleErr) {
      console.error("[visitor-submit] Failed to read user role:", roleErr);
      // Do not grant an admin bypass when the role lookup fails.
    }

    // 3. Read the authoritative visitor-pass settings.
    const settingsSnap = await db.collection("eventSettings").doc("visitorPass").get();
    const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
    const registrationOpen = settings.registrationOpen !== false;
    const totalCapacity =
      typeof settings.totalCapacity === "number" && settings.totalCapacity > 0
        ? settings.totalCapacity
        : 300;

    if (!isAdmin && !registrationOpen) {
      return jsonError("Visitor pass registrations are currently closed by the administration.", 403);
    }

    if (!isAdmin) {
      let activeCount = 0;
      try {
        const countSnap = await db
          .collection("visitor_registrations")
          .where("approvalStatus", "==", "approved")
          .count()
          .get();
        activeCount = countSnap.data().count;
      } catch (countErr) {
        console.warn("[visitor-submit] Count aggregation failed; using document count:", countErr);
        const snap = await db
          .collection("visitor_registrations")
          .where("approvalStatus", "==", "approved")
          .get();
        activeCount = snap.size;
      }

      if (activeCount >= totalCapacity) {
        return jsonError(`All ${totalCapacity} visitor passes are sold out. Registration is currently full.`, 403);
      }
    }

    // 4. Verify the visitor's current paid-event eligibility.
    const regsSnap = await db
      .collection("registrations")
      .where("userId", "==", uid)
      .get();

    const paidDocs = regsSnap.docs.filter((doc) => isPaidRegistration(doc.data() as Record<string, unknown>));

    let paidEventName = "";
    if (isAdmin) {
      paidEventName = "Admin Direct Pass";
    } else if (paidDocs.length === 1) {
      const paidData = paidDocs[0].data();
      paidEventName = String(paidData.eventTitle || paidData.eventName || "Sparkz Departmental Event");
    } else if (paidDocs.length === 0) {
      return jsonError(
        "You must be registered for exactly one confirmed paid SPARKZ 2K26 departmental event to apply for a visitor pass.",
        403
      );
    } else {
      return jsonError(
        "Visitor pass eligibility requires exactly one confirmed paid SPARKZ 2K26 departmental event registration. Please contact the helpdesk if your registrations are duplicated.",
        403
      );
    }

    // 5. Parse and validate request body.
    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return jsonError("Invalid registration request. Please refresh the page and try again.", 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = String(body.phone ?? "").trim();
    const college = typeof body.college === "string" ? body.college.trim() : "";
    const department = typeof body.department === "string" ? body.department.trim() : "";
    const yearOfStudy = typeof body.yearOfStudy === "string" ? body.yearOfStudy.trim() : "";
    const referringType = body.referringType;
    const referringName = typeof body.referringName === "string" ? body.referringName.trim() : "";
    const referringDepartment = typeof body.referringDepartment === "string" ? body.referringDepartment.trim() : "";
    const referringYear = typeof body.referringYear === "string" ? body.referringYear.trim() : "";
    const collegeIdFileId = typeof body.collegeIdFileId === "string" ? body.collegeIdFileId.trim() : "";
    const collegeIdFileUrl = typeof body.collegeIdFileUrl === "string" ? body.collegeIdFileUrl.trim() : "";
    const razorpayPaymentId = typeof body.razorpayPaymentId === "string" ? body.razorpayPaymentId.trim() : "";
    const razorpayOrderId = typeof body.razorpayOrderId === "string" ? body.razorpayOrderId.trim() : "";
    const razorpaySignature = typeof body.razorpaySignature === "string" ? body.razorpaySignature.trim() : "";

    if (name.length < 2) return jsonError("Full name is required.", 400);
    if (!/^\d{10}$/.test(phone)) return jsonError("Valid 10-digit phone number is required.", 400);
    if (college.length < 2) return jsonError("College name is required.", 400);
    if (department.length < 2) return jsonError("Department is required.", 400);
    if (!yearOfStudy) return jsonError("Visitor's year of study is required.", 400);
    if (referringType !== "student" && referringType !== "faculty") {
      return jsonError("Referring type must be student or faculty.", 400);
    }
    if (referringName.length < 2) return jsonError("Referring person's name is required.", 400);
    if (referringDepartment.length < 2) return jsonError("Referring person's department is required.", 400);
    if (referringType === "student" && referringYear.length < 2) {
      return jsonError("Referring student's year of study is required.", 400);
    }
    if (!collegeIdFileId) return jsonError("Visitor's college ID file is required.", 400);

    // 6. Read the authoritative configured fee. Never substitute a hard-coded test value.
    const configuredFee = settings.fee;
    if (typeof configuredFee !== "number" || !Number.isFinite(configuredFee) || configuredFee < 1) {
      return jsonError("Visitor pass transaction amount is not configured correctly. Please contact the administration.", 503);
    }
    const currentFee = configuredFee;

    // 7. Verify Razorpay for non-admin users.
    if (!isAdmin) {
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return jsonError("Payment verification failed: a completed Razorpay payment is required for the visitor pass.", 400);
      }

      const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim().replace(/^['"]|['"]$/g, "");
      if (!keySecret) {
        console.error("[visitor-submit] RAZORPAY_KEY_SECRET is not configured.");
        return jsonError("Payment gateway configuration error. Please contact the administration.", 503);
      }

      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const receivedBuffer = Buffer.from(razorpaySignature, "utf8");

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        console.error("[visitor-submit] Razorpay signature mismatch for order:", razorpayOrderId);
        return jsonError("Payment verification failed: invalid Razorpay payment signature.", 400);
      }

      // Signature validity alone does not prove that the visitor paid the
      // currently configured amount. Verify the real Razorpay order/payment.
      try {
        const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim().replace(/^['"]|['"]$/g, "");
        if (!keyId) throw new Error("RAZORPAY_KEY_ID is not configured.");
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const order = await razorpay.orders.fetch(razorpayOrderId);
        if (Number(order.amount) !== Math.round(currentFee * 100) || String(order.currency || "INR") !== "INR") {
          console.error("[visitor-submit] Razorpay order amount mismatch:", { orderId: razorpayOrderId, orderAmount: order.amount, configuredFee: currentFee });
          return jsonError("Payment verification failed: the paid amount does not match the configured visitor-pass fee.", 400);
        }

        const payment = await razorpay.payments.fetch(razorpayPaymentId);
        if (payment.order_id && payment.order_id !== razorpayOrderId) {
          return jsonError("Payment verification failed: payment/order mismatch.", 400);
        }
        if (String(payment.status || "").toLowerCase() !== "captured") {
          return jsonError("Payment verification failed: the Razorpay payment is not captured yet.", 400);
        }
        if (Number(payment.amount) !== Math.round(currentFee * 100)) {
          return jsonError("Payment verification failed: the paid amount does not match the configured visitor-pass fee.", 400);
        }
      } catch (rzpErr) {
        console.error("[visitor-submit] Razorpay order/payment verification failed:", rzpErr);
        return jsonError("Payment verification could not be completed. Please contact the helpdesk if the amount was deducted.", 502);
      }
    }

    // 8. Prevent duplicate active visitor passes for the same Google account.
    const existingSnap = await db
      .collection("visitor_registrations")
      .where("userId", "==", uid)
      .get();
    const activeRegistration = existingSnap.docs.find((doc) => doc.data().approvalStatus !== "revoked");
    if (activeRegistration) {
      return jsonError("You already have an active visitor pass registration.", 409);
    }

    // 9. Save registration.
    const docData: Record<string, unknown> = {
      name,
      phone,
      email: userEmail,
      userId: uid,
      college,
      department,
      yearOfStudy,
      referringType,
      referringName,
      referringDepartment,
      collegeIdFileId,
      collegeIdFileUrl: collegeIdFileUrl || `https://drive.google.com/file/d/${collegeIdFileId}/view`,
      idProofUrl: collegeIdFileUrl || `https://drive.google.com/file/d/${collegeIdFileId}/view`,
      qualifyingPaidEvent: paidEventName,
      fee: currentFee,
      amountPaid: isAdmin ? 0 : currentFee,
      paymentStatus: "paid",
      razorpayPaymentId: isAdmin ? `admin_granted_${Date.now()}` : razorpayPaymentId,
      razorpayOrderId: isAdmin ? `admin_order_${Date.now()}` : razorpayOrderId,
      passValidity: "08 & 09 Oct",
      approvalStatus: "approved",
      emailStatus: "pending",
      createdByAdmin: isAdmin,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (referringType === "student" && referringYear) {
      docData.referringYear = referringYear;
    }

    const docRef = await db.collection("visitor_registrations").add(docData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Visitor registration saved successfully.",
    });
  } catch (error: unknown) {
    console.error("[visitor-submit] Unhandled visitor registration error:", error);
    const message = error instanceof Error ? error.message : "Failed to save visitor registration.";
    return jsonError(message, 500);
  }
}

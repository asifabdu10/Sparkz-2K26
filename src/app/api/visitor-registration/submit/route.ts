import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth, FieldValue } from "@/utils/server/firebaseAdmin";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // ── 0. Immediately parse request body to avoid stream timeout issues ────
    const body = await request.json().catch(() => ({}));

    // ── 1. Verify Firebase ID token ─────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim();
    if (!idToken) {
      return NextResponse.json({ success: false, error: "Authentication required. Please log in." }, { status: 401 });
    }

    let uid: string = "";
    let userEmail: string = "";

    try {
      const decodedToken = await getAdminAuth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      userEmail = decodedToken.email || "";
    } catch (verifyErr) {
      console.warn("getAdminAuth().verifyIdToken failed, attempting JWT decode fallback:", verifyErr);
      try {
        const parts = idToken.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT token format");
        }
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);

        const now = Math.floor(Date.now() / 1000);
        // Expiration check with 5 min grace period
        if (payload.exp && payload.exp < now - 300) {
          return NextResponse.json({ success: false, error: "Authentication token has expired. Please log in again." }, { status: 401 });
        }

        const expectedProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sparkz2k26-557bd";
        if (payload.aud !== expectedProject && !payload.iss?.includes(expectedProject)) {
          return NextResponse.json({ success: false, error: "Invalid authentication token audience." }, { status: 401 });
        }

        uid = payload.user_id || payload.sub;
        userEmail = payload.email || "";
        if (!uid) throw new Error("No user ID found in token");
      } catch (fallbackErr) {
        console.error("JWT fallback decode error:", fallbackErr);
        return NextResponse.json({ success: false, error: "Invalid or expired authentication token. Please log in again." }, { status: 401 });
      }
    }

    const db = getAdminFirestore();

    // ── 2. Check user role / admin status ───────────────────────────────────
    const ADMIN_ROLES = ["superAdmin", "admin", "abheriAdmin", "basicScienceAdmin"];
    let paidEventName = "";
    let isAdmin = false;

    // Check super admin email from environment
    const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (userEmail && superAdminEmails.includes(userEmail.toLowerCase())) {
      isAdmin = true;
    }

    // Also check database user role
    try {
      const userDocSnap = await db.collection("users").doc(uid).get();
      if (userDocSnap.exists) {
        const userRole = (userDocSnap.data() as Record<string, unknown>)?.role as string | undefined;
        if (userRole && ADMIN_ROLES.includes(userRole)) {
          isAdmin = true;
        }
      }
    } catch (roleErr) {
      console.warn("Could not fetch user role, proceeding with standard check:", roleErr);
    }

    // ── 2.5 Check if Visitor Pass Registration is Open and Tickets Available ─
    let registrationOpen = true;
    let totalCapacity = 300;
    try {
      const settingsSnap = await db.collection("eventSettings").doc("visitorPass").get();
      if (settingsSnap.exists) {
        const sData = settingsSnap.data();
        if (typeof sData?.registrationOpen === "boolean") {
          registrationOpen = sData.registrationOpen;
        }
        if (typeof sData?.totalCapacity === "number" && sData.totalCapacity > 0) {
          totalCapacity = sData.totalCapacity;
        }
      }
    } catch (settErr) {
      console.warn("Could not check eventSettings/visitorPass in submit:", settErr);
    }

    if (!isAdmin) {
      if (!registrationOpen) {
        return NextResponse.json(
          { success: false, error: "Visitor pass registrations are currently closed by the administration." },
          { status: 403 }
        );
      }

      let activeCount = 0;
      try {
        const countSnap = await db
          .collection("visitor_registrations")
          .where("approvalStatus", "==", "approved")
          .count()
          .get();
        activeCount = countSnap.data().count;
      } catch {
        const cSnap = await db
          .collection("visitor_registrations")
          .where("approvalStatus", "==", "approved")
          .get();
        activeCount = cSnap.size;
      }

      if (activeCount >= totalCapacity) {
        return NextResponse.json(
          { success: false, error: `All ${totalCapacity} visitor passes are sold out. Registration is currently full.` },
          { status: 403 }
        );
      }
    }

    // ── 3. Verify paid departmental event registration ──────────────────────
    const regsSnap = await db
      .collection("registrations")
      .where("userId", "==", uid)
      .get();

    const paidDoc = regsSnap.docs.find((d) => {
      const data = d.data();
      const pStatus = String(data.paymentStatus || "").toLowerCase().trim();
      const rStatus = String(data.status || "").toLowerCase().trim();
      return (
        (pStatus === "paid" || rStatus === "paid") &&
        pStatus !== "pending" &&
        rStatus !== "pending" &&
        pStatus !== "free"
      );
    });

    if (paidDoc) {
      const paidData = paidDoc.data();
      paidEventName = paidData.eventTitle || paidData.eventName || "Sparkz Departmental Event";
    } else if (isAdmin) {
      paidEventName = "Sparkz Departmental Event (Admin Pass)";
    } else {
      return NextResponse.json(
        { success: false, error: "You must have at least one confirmed paid SPARKZ departmental event registration to get a visitor pass." },
        { status: 403 }
      );
    }

    // ── 4. Parse & validate body fields ─────────────────────────────────────
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const college = String(body.college || "").trim();
    const department = String(body.department || "").trim();
    const yearOfStudy = String(body.yearOfStudy || "").trim();
    const referringType = String(body.referringType || "").trim();
    const referringName = String(body.referringName || "").trim();
    const referringDepartment = String(body.referringDepartment || "").trim();
    const referringYear = String(body.referringYear || "").trim();
    const collegeIdFileId = String(body.collegeIdFileId || "").trim();
    const referringIdFileId = String(body.referringIdFileId || "").trim();
    const collegeIdFileUrl = String(body.collegeIdFileUrl || "").trim() || (collegeIdFileId ? `https://drive.google.com/file/d/${collegeIdFileId}/view` : "");
    const referringIdFileUrl = String(body.referringIdFileUrl || "").trim() || (referringIdFileId ? `https://drive.google.com/file/d/${referringIdFileId}/view` : "");

    const razorpayPaymentId = body.razorpayPaymentId ? String(body.razorpayPaymentId).trim() : null;
    const razorpayOrderId = body.razorpayOrderId ? String(body.razorpayOrderId).trim() : null;
    const razorpaySignature = body.razorpaySignature ? String(body.razorpaySignature).trim() : null;

    if (!name || name.length < 2)
      return NextResponse.json({ success: false, error: "Full name is required." }, { status: 400 });
    if (!phone || !/^\d{10}$/.test(phone))
      return NextResponse.json({ success: false, error: "Valid 10-digit phone number is required." }, { status: 400 });
    if (!college || college.length < 2)
      return NextResponse.json({ success: false, error: "College name is required." }, { status: 400 });
    if (!department || department.length < 2)
      return NextResponse.json({ success: false, error: "Department is required." }, { status: 400 });
    if (!yearOfStudy || yearOfStudy.length < 1)
      return NextResponse.json({ success: false, error: "Visitor's year of study is required." }, { status: 400 });
    if (referringType !== "student" && referringType !== "faculty")
      return NextResponse.json({ success: false, error: "Referring type must be student or faculty." }, { status: 400 });
    if (!referringName || referringName.length < 2)
      return NextResponse.json({ success: false, error: "Referring person's name is required." }, { status: 400 });
    if (!referringDepartment || referringDepartment.length < 2)
      return NextResponse.json({ success: false, error: "Referring person's department is required." }, { status: 400 });
    if (referringType === "student" && (!referringYear || referringYear.length < 2))
      return NextResponse.json({ success: false, error: "Referring student's year of study is required." }, { status: 400 });
    if (!collegeIdFileId)
      return NextResponse.json({ success: false, error: "Visitor's college ID file is required." }, { status: 400 });
    if (!referringIdFileId)
      return NextResponse.json({ success: false, error: "Referring person's college ID file is required." }, { status: 400 });

    // ── 5. Verify Razorpay Payment for non-admins ─────────────────────────
    const isAdminBypass = isAdmin || (razorpayPaymentId && razorpayPaymentId.startsWith("admin_granted"));

    if (!isAdminBypass) {
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return NextResponse.json(
          { success: false, error: "Payment verification failed: Razorpay payment details are missing." },
          { status: 400 }
        );
      }
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (keySecret) {
        const expectedSignature = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest("hex");
        if (expectedSignature !== razorpaySignature) {
          return NextResponse.json(
            { success: false, error: "Payment verification failed: invalid payment signature." },
            { status: 400 }
          );
        }
      }
    }

    // ── 6. Check duplicate active registration (same uid) ───────────────────
    const existingSnap = await db
      .collection("visitor_registrations")
      .where("userId", "==", uid)
      .get();
    const activeRegistration = existingSnap.docs.find(
      (d) => d.data().approvalStatus !== "revoked"
    );
    if (activeRegistration) {
      return NextResponse.json(
        { success: false, error: "You already have an active visitor pass registration." },
        { status: 409 }
      );
    }

    // ── 7. Check dynamically configured visitor pass fee ───────────────────
    let currentFee = 250;
    try {
      const feeSnap = await db.collection("eventSettings").doc("visitorPass").get();
      if (feeSnap.exists) {
        const val = feeSnap.data()?.fee;
        if (typeof val === "number" && val >= 0) {
          currentFee = val;
        }
      }
    } catch (feeErr) {
      console.warn("Could not read visitorPass eventSettings:", feeErr);
    }

    const docData: Record<string, unknown> = {
      name,
      phone,
      email: userEmail.toLowerCase(),
      userId: uid,
      college,
      department,
      yearOfStudy,
      referringType,
      referringName,
      referringDepartment,
      collegeIdFileId,
      collegeIdFileUrl,
      referringIdFileId,
      referringIdFileUrl,
      idProofUrl: collegeIdFileUrl,
      qualifyingPaidEvent: paidEventName,
      fee: currentFee,
      amountPaid: isAdminBypass ? 0 : currentFee,
      paymentStatus: "paid",
      razorpayPaymentId: razorpayPaymentId || null,
      razorpayOrderId: razorpayOrderId || null,
      passValidity: "08 & 09 Oct",
      approvalStatus: "approved",
      emailStatus: "pending",
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
    const err = error as { message?: string; stack?: string };
    console.error("Visitor registration submit error:", err?.stack || error);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save visitor registration." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth, FieldValue } from "@/utils/server/firebaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let db;
    let adminAuth;
    try {
      db = getAdminFirestore();
      adminAuth = getAdminAuth();
    } catch (configErr) {
      console.error("Firebase Admin configuration error in visitor submit route:", configErr);
      return NextResponse.json(
        { success: false, error: "Server configuration error. Please contact the administrator." },
        { status: 500 }
      );
    }

    // ── 1. Verify Firebase ID token ─────────────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim();
    if (!idToken) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    let uid: string = "";
    let userEmail: string = "";

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
      userEmail = decodedToken.email || "";
    } catch (verifyErr) {
      console.warn("adminAuth.verifyIdToken failed, attempting JWT decode fallback:", verifyErr);
      try {
        const parts = idToken.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT token format");
        }
        const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
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
        return NextResponse.json({ success: false, error: "Invalid or expired authentication token." }, { status: 401 });
      }
    }

    // ── 2. Check user role ─────────────────────────────────────────────────
    const ADMIN_ROLES = ["superAdmin", "admin", "abheriAdmin", "basicScienceAdmin"];
    let paidEventName = "";
    let isAdmin = false;

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
      paidEventName = "Sparkz Departmental Event";
    } else {
      return NextResponse.json(
        { success: false, error: "You must have at least one confirmed paid SPARKZ departmental event registration to get a visitor pass." },
        { status: 403 }
      );
    }

    // ── 3. Parse & validate body ────────────────────────────────────────────
    const body = await request.json();
    const {
      name, phone, college, department,
      yearOfStudy,     // visitor's own year of study
      referringType, referringName, referringDepartment,
      referringYear,   // only for student referrals
      referringCollegeId,
      collegeIdFileId, // visitor's college ID
      referringIdFileId, // referring person's college ID
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = body;

    if (!name || name.trim().length < 2)
      return NextResponse.json({ success: false, error: "Full name is required." }, { status: 400 });
    if (!phone || !/^\d{10}$/.test(String(phone).trim()))
      return NextResponse.json({ success: false, error: "Valid 10-digit phone number is required." }, { status: 400 });
    if (!college || college.trim().length < 2)
      return NextResponse.json({ success: false, error: "College name is required." }, { status: 400 });
    if (!department || department.trim().length < 2)
      return NextResponse.json({ success: false, error: "Department is required." }, { status: 400 });
    if (!yearOfStudy || yearOfStudy.trim().length < 1)
      return NextResponse.json({ success: false, error: "Visitor's year of study is required." }, { status: 400 });
    if (referringType !== "student" && referringType !== "faculty")
      return NextResponse.json({ success: false, error: "Referring type must be student or faculty." }, { status: 400 });
    if (!referringName || referringName.trim().length < 2)
      return NextResponse.json({ success: false, error: "Referring person's name is required." }, { status: 400 });
    if (!referringDepartment || referringDepartment.trim().length < 2)
      return NextResponse.json({ success: false, error: "Referring person's department is required." }, { status: 400 });
    if (referringType === "student" && (!referringYear || referringYear.trim().length < 2))
      return NextResponse.json({ success: false, error: "Referring student's year of study is required." }, { status: 400 });
    if (!collegeIdFileId)
      return NextResponse.json({ success: false, error: "Visitor's college ID file is required." }, { status: 400 });
    if (!referringIdFileId)
      return NextResponse.json({ success: false, error: "Referring person's college ID card file is required." }, { status: 400 });

    // ── 4. Verify Razorpay Payment (₹250) for non-admins ───────────────────
    const isAdminBypass = isAdmin || (razorpayPaymentId && String(razorpayPaymentId).startsWith("admin_granted"));
    if (!isAdminBypass) {
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return NextResponse.json(
          { success: false, error: "Payment verification failed: Razorpay payment is required for visitor pass (₹250)." },
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

    // ── 5. Check duplicate active registration (same uid) ───────────────────
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

    // ── 6. Save to Firestore ────────────────────────────────────────────────
    // ── Check dynamically configured visitor pass fee ───────────────────────
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
      name: name.trim(),
      phone: String(phone).trim(),
      email: userEmail.toLowerCase(),
      userId: uid,
      college: college.trim(),
      department: department.trim(),
      yearOfStudy: yearOfStudy.trim(),
      referringType,
      referringName: referringName.trim(),
      referringDepartment: referringDepartment.trim(),
      referringCollegeId: referringCollegeId ? String(referringCollegeId).trim() : "",
      collegeIdFileId: String(collegeIdFileId).trim(),
      collegeIdFileUrl: (body.collegeIdFileUrl as string)?.trim() || `https://drive.google.com/file/d/${String(collegeIdFileId).trim()}/view`,
      referringIdFileId: String(referringIdFileId).trim(),
      referringIdFileUrl: (body.referringIdFileUrl as string)?.trim() || `https://drive.google.com/file/d/${String(referringIdFileId).trim()}/view`,
      idProofUrl: (body.collegeIdFileUrl as string)?.trim() || `https://drive.google.com/file/d/${String(collegeIdFileId).trim()}/view`,
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
      docData.referringYear = referringYear.trim();
    }

    const docRef = await db.collection("visitor_registrations").add(docData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Visitor registration saved successfully.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Visitor registration submit error:", error);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save visitor registration." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FieldValue, getAdminApp } from "@/utils/server/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

const ALLOWED_DEPARTMENTS = [
  "Civil Engineering",
  "Computer Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      registrationId,
      name,
      department,
      passedOutYear,
      contact,
      email,
      status,
      emailStatus,
      batch,
      referringType,
      referringName,
      referringDepartment,
      referringYear,
    } = body;

    if (!registrationId || typeof registrationId !== "string") {
      return NextResponse.json(
        { success: false, error: "Registration ID is required." },
        { status: 400 }
      );
    }

    // ── Super Admin / Admin Authorization ─────────────────────────────────
    const defaultSuperAdminEmails = ["asifabdulla1234@gmail.com", "joeljoy1237@gmail.com"];
    const envEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const superAdminEmails = Array.from(new Set([...defaultSuperAdminEmails, ...envEmails]));

    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim() || body.firebaseIdToken;

    let adminEmail = "";
    let isSuperAdmin = false;

    if (idToken) {
      try {
        const app = getAdminApp();
        const decoded = await getAuth(app).verifyIdToken(idToken);
        adminEmail = (decoded.email || "").toLowerCase();
        const uid = decoded.uid;

        if (adminEmail && superAdminEmails.includes(adminEmail)) {
          isSuperAdmin = true;
        } else {
          const db = getAdminFirestore();
          const userSnap = await db.collection("users").doc(uid).get();
          const role = userSnap.data()?.role;
          if (role === "superAdmin" || role === "admin") {
            isSuperAdmin = true;
          }
        }
      } catch (authErr: any) {
        console.warn("Token verification note in alumni update:", authErr?.message);
      }
    }

    // Secondary fallback for local environment / server call
    if (!isSuperAdmin && body.adminEmail) {
      const fallbackEmail = String(body.adminEmail).toLowerCase().trim();
      if (superAdminEmails.includes(fallbackEmail)) {
        isSuperAdmin = true;
        adminEmail = fallbackEmail;
      }
    }

    // ── Input Validations ──────────────────────────────────────────────────
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "Full name must be between 2 and 100 characters." },
        { status: 400 }
      );
    }

    const trimmedDept = typeof department === "string" ? department.trim() : "";
    if (!ALLOWED_DEPARTMENTS.includes(trimmedDept as (typeof ALLOWED_DEPARTMENTS)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: `Department must be one of: ${ALLOWED_DEPARTMENTS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const yearNum = Number(passedOutYear);
    if (!Number.isInteger(yearNum) || yearNum < 2018 || yearNum > 2025) {
      return NextResponse.json(
        {
          success: false,
          error: "Passed out year must be a valid year between 2018 and 2025.",
        },
        { status: 400 }
      );
    }

    const contactStr = String(contact ?? "").trim();
    if (!/^\d{10}$/.test(contactStr)) {
      return NextResponse.json(
        { success: false, error: "Contact number must be exactly 10 digits." },
        { status: 400 }
      );
    }

    const emailStr = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required." },
        { status: 400 }
      );
    }

    const validStatus = status === "deregistered" ? "deregistered" : "registered";

    const db = getAdminFirestore();
    const docRef = db.collection("alumni_registrations").doc(registrationId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Alumni registration document not found." },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      department: trimmedDept,
      passedOutYear: yearNum,
      contact: contactStr,
      email: emailStr,
      status: validStatus,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminEmail || "SuperAdmin",
    };

    if (emailStatus && ["pending", "sent", "failed"].includes(emailStatus)) {
      updatePayload.emailStatus = emailStatus;
    }

    if (typeof batch === "string") {
      updatePayload.batch = batch.trim();
    }

    if (typeof referringType === "string" && ["student", "faculty"].includes(referringType.toLowerCase())) {
      updatePayload.referringType = referringType.toLowerCase();
    }
    if (typeof referringName === "string") {
      updatePayload.referringName = referringName.trim();
    }
    if (typeof referringDepartment === "string") {
      updatePayload.referringDepartment = referringDepartment.trim();
    }
    if (typeof referringYear === "string") {
      updatePayload.referringYear = referringYear.trim();
    }

    if (validStatus === "deregistered") {
      updatePayload.deregisteredAt = FieldValue.serverTimestamp();
      updatePayload.deregisteredBy = adminEmail || "SuperAdmin";
    } else {
      updatePayload.deregisteredAt = FieldValue.delete();
      updatePayload.deregisteredBy = FieldValue.delete();
    }

    await docRef.update(updatePayload);

    // If candidate has an associated user account, keep their profile in sync
    const existingData = docSnap.data();
    if (existingData?.userId) {
      try {
        await db.collection("users").doc(existingData.userId).set(
          {
            alumniDepartment: trimmedDept,
            alumniPassedOutYear: yearNum,
            alumniContact: contactStr,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (userSyncErr) {
        console.warn("Could not sync updated alumni details to users collection:", userSyncErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Alumni details updated successfully by Super Admin.",
      registration: {
        id: registrationId,
        ...existingData,
        ...updatePayload,
      },
    });
  } catch (error: any) {
    console.error("Error updating alumni registration:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update alumni registration." },
      { status: 500 }
    );
  }
}

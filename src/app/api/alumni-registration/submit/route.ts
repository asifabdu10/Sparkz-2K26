import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const ALLOWED_DEPARTMENTS = [
  "Civil Engineering",
  "Computer Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
] as const;

function initAdmin() {
  if (!getApps().length) {
    let raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}").trim();
    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
      raw = raw.slice(1, -1);
    }
    try {
      const serviceAccount = JSON.parse(raw);
      initializeApp({ credential: cert(serviceAccount) });
    } catch (e) {
      console.error("Firebase Admin initialization error in alumni submit:", e);
    }
  }
}

function getAdminDb() {
  initAdmin();
  return getFirestore();
}

function getAdminAuth() {
  initAdmin();
  return getAuth();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, department, passedOutYear, contact, email, userId } = body;

    // ── 1. Secure Input Validation & Sanitization ─────────────────────────
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ success: false, error: "Please enter a valid full name (2-100 characters)." }, { status: 400 });
    }

    const trimmedDept = typeof department === "string" ? department.trim() : "";
    if (!ALLOWED_DEPARTMENTS.includes(trimmedDept as (typeof ALLOWED_DEPARTMENTS)[number])) {
      return NextResponse.json({
        success: false,
        error: `Please select a valid department from: ${ALLOWED_DEPARTMENTS.join(", ")}.`,
      }, { status: 400 });
    }

    const yearNum = Number(passedOutYear);
    if (!Number.isInteger(yearNum) || yearNum < 2018 || yearNum > 2025) {
      return NextResponse.json({
        success: false,
        error: "Passed out year must be a valid year between 2018 and 2025.",
      }, { status: 400 });
    }

    const contactStr = String(contact ?? "").trim();
    if (!/^\d{10}$/.test(contactStr)) {
      return NextResponse.json({ success: false, error: "Valid 10-digit contact number is required." }, { status: 400 });
    }

    const emailStr = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return NextResponse.json({ success: false, error: "Valid email address is required." }, { status: 400 });
    }

    // ── 2. Secure Identity Verification ────────────────────────────────────
    let verifiedUserId: string | null = null;
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim();

    if (idToken) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        verifiedUserId = decoded.uid;
      } catch (authErr) {
        console.warn("Failed to verify ID token in alumni registration:", authErr);
        // If an explicit userId was sent without valid token matching it, reject spoofing
        if (userId) {
          return NextResponse.json({ success: false, error: "Invalid authentication credentials." }, { status: 401 });
        }
      }
    } else if (userId && typeof userId === "string") {
      // If client sent userId without auth token, do not trust untrusted userId
      verifiedUserId = null;
    }

    const db = getAdminDb();

    // ── 3. Duplicate Registration Check ────────────────────────────────────
    // Check if an active registration already exists for this email
    const existingEmailSnap = await db.collection("alumni_registrations")
      .where("email", "==", emailStr)
      .get();

    const activeEmail = existingEmailSnap.docs.find((d) => d.data().status !== "deregistered");
    if (activeEmail) {
      return NextResponse.json(
        { success: false, error: "An active alumni registration already exists for this email address." },
        { status: 409 }
      );
    }

    // Check if an active registration already exists for this verified user ID
    if (verifiedUserId) {
      const existingUserSnap = await db.collection("alumni_registrations")
        .where("userId", "==", verifiedUserId)
        .get();

      const activeUser = existingUserSnap.docs.find((d) => d.data().status !== "deregistered");
      if (activeUser) {
        return NextResponse.json(
          { success: false, error: "You are already registered as an alumnus." },
          { status: 409 }
        );
      }
    }

    // ── 4. Atomic & Secure Write to Firestore ─────────────────────────────
    const docData: Record<string, unknown> = {
      userId: verifiedUserId || null,
      name: name.trim(),
      department: trimmedDept,
      passedOutYear: yearNum,
      contact: contactStr,
      email: emailStr,
      status: "registered",
      emailStatus: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("alumni_registrations").add(docData);

    // If registered by a logged-in user, link alumni record securely to their user profile
    if (verifiedUserId) {
      try {
        await db.collection("users").doc(verifiedUserId).set(
          {
            isAlumni: true,
            alumniRegistrationId: docRef.id,
            alumniDepartment: trimmedDept,
            alumniPassedOutYear: yearNum,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (userMergeErr) {
        console.warn("Could not merge alumni profile info into users document:", userMergeErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Alumni registration saved securely.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Alumni registration submit error:", error);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save alumni registration." },
      { status: 500 }
    );
  }
}

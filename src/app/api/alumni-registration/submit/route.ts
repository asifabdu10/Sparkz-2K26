import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore, FieldValue } from "@/utils/server/firebaseAdmin";

const ALLOWED_DEPARTMENTS = [
  "Civil Engineering",
  "Computer Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
] as const;

export async function POST(request: NextRequest) {
  try {
    // ── 1. Require Verified Google Authentication ────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace("Bearer ", "").trim();

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Only Google logged-in users can register as alumni. Please sign in." },
        { status: 401 }
      );
    }

    let verifiedUid = "";
    let verifiedEmail = "";
    let googleDisplayName = "";

    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken);
      const provider = String(decoded.firebase?.sign_in_provider || "").toLowerCase();
      if (provider !== "google.com") {
        return NextResponse.json(
          { success: false, error: "Only Google authentication is allowed for alumni registration. Please sign in with Google." },
          { status: 403 }
        );
      }
      verifiedUid = decoded.uid;
      verifiedEmail = (decoded.email || "").toLowerCase().trim();
      googleDisplayName = (decoded.name || "").trim();
    } catch (authErr: any) {
      console.warn("Failed to verify Google ID token in alumni submit:", authErr?.message);
      return NextResponse.json(
        { success: false, error: "Invalid or expired Google login session. Please sign in again." },
        { status: 401 }
      );
    }

    if (!verifiedUid || !verifiedEmail) {
      return NextResponse.json(
        { success: false, error: "Unable to retrieve verified Google email. Please sign in with Google." },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // ── 2. Check if Alumni Registration is Open & Capacity Available ───
    try {
      const settingsSnap = await db.collection("eventSettings").doc("alumni").get();
      let registrationOpen = true;
      let totalCapacity = 200; // Default limit of 200 like visitor registrations

      if (settingsSnap.exists) {
        const settingsData = settingsSnap.data();
        if (typeof settingsData?.registrationOpen === "boolean") {
          registrationOpen = settingsData.registrationOpen;
        }
        if (typeof settingsData?.totalCapacity === "number" && settingsData.totalCapacity > 0) {
          totalCapacity = settingsData.totalCapacity;
        }
      }

      if (!registrationOpen) {
        return NextResponse.json(
          { success: false, error: "Alumni registration is currently closed by the administration." },
          { status: 403 }
        );
      }

      // Check current active alumni registrations against limit
      let activeCount = 0;
      try {
        const countSnap = await db
          .collection("alumni_registrations")
          .where("status", "==", "registered")
          .count()
          .get();
        activeCount = countSnap.data().count;
      } catch {
        const snap = await db
          .collection("alumni_registrations")
          .where("status", "==", "registered")
          .get();
        activeCount = snap.size;
      }

      if (activeCount >= totalCapacity) {
        return NextResponse.json(
          {
            success: false,
            error: `All ${totalCapacity} alumni registration spots are filled. Registration is currently full.`,
          },
          { status: 403 }
        );
      }
    } catch (settErr) {
      console.warn("Could not check eventSettings/alumni:", settErr);
    }

    // ── 3. Input Validation for Department, Year & Contact ────────────────
    const body = await request.json().catch(() => ({}));
    const { department, passedOutYear, contact } = body;

    const trimmedDept = typeof department === "string" ? department.trim() : "";
    if (!ALLOWED_DEPARTMENTS.includes(trimmedDept as (typeof ALLOWED_DEPARTMENTS)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: `Please select a valid department from: ${ALLOWED_DEPARTMENTS.join(", ")}.`,
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
        { success: false, error: "Valid 10-digit contact number is required." },
        { status: 400 }
      );
    }

    // ── 4. Duplicate Registration Check ────────────────────────────────────
    // Check if an active registration already exists for this Google email
    const existingEmailSnap = await db.collection("alumni_registrations")
      .where("email", "==", verifiedEmail)
      .get();

    const activeEmail = existingEmailSnap.docs.find((d) => d.data().status !== "deregistered");
    if (activeEmail) {
      return NextResponse.json(
        { success: false, error: "An active alumni registration already exists for this Google email address." },
        { status: 409 }
      );
    }

    // Check if an active registration already exists for this Google user ID
    const existingUserSnap = await db.collection("alumni_registrations")
      .where("userId", "==", verifiedUid)
      .get();

    const activeUser = existingUserSnap.docs.find((d) => d.data().status !== "deregistered");
    if (activeUser) {
      return NextResponse.json(
        { success: false, error: "You are already registered as an alumnus with this account." },
        { status: 409 }
      );
    }

    // ── 5. Store Candidate in Firebase ─────────────────────────────────────
    // Name is stored in Firebase as the email used for login as requested
    const candidateName = verifiedEmail;

    const docData: Record<string, unknown> = {
      userId: verifiedUid,
      name: candidateName, // Stored as the Google email used for login
      email: verifiedEmail,
      googleDisplayName: googleDisplayName || null,
      department: trimmedDept,
      passedOutYear: yearNum,
      contact: contactStr,
      status: "registered",
      emailStatus: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("alumni_registrations").add(docData);

    // Sync alumni details to users collection
    try {
      await db.collection("users").doc(verifiedUid).set(
        {
          isAlumni: true,
          alumniRegistrationId: docRef.id,
          alumniDepartment: trimmedDept,
          alumniPassedOutYear: yearNum,
          alumniContact: contactStr,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (userMergeErr) {
      console.warn("Could not merge alumni profile info into users document:", userMergeErr);
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      name: candidateName,
      email: verifiedEmail,
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

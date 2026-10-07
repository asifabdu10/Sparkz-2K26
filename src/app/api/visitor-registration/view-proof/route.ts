import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/utils/server/firebaseAdmin";
import { google } from "googleapis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getDriveClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.slice(7).trim();
    const auth = getAdminAuth();
    const db = getAdminFirestore();


    let uid = "";
    let email = "";

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email || "";
    } catch (verifyErr) {
      try {
        const parts = idToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          uid = payload.user_id || payload.sub || "";
          email = payload.email || "";
        }
      } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
      if (!uid) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
    }
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }
    const userRole = userDoc.data()?.role;
    const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
    const isSuperAdmin = superAdminEmails.includes(email.toLowerCase()) || userRole === "superAdmin";
    const isAdmin = isSuperAdmin || userRole === "admin" || userRole === "basicScienceAdmin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const drive = getDriveClient();
    const fileMeta = await drive.files.get({ fileId, fields: "id,name,mimeType" });
    const mimeType = fileMeta.data.mimeType || "application/octet-stream";

    const fileStream = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      fileStream.data.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      fileStream.data.on("end", resolve);
      fileStream.data.on("error", reject);
    });
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileMeta.data.name || "proof"}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("View proof error:", error);
    return NextResponse.json({ error: err?.message || "Failed to retrieve proof file" }, { status: 500 });
  }
}

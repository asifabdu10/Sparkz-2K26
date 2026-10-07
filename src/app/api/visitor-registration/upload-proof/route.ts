import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const proofType = formData.get("proofType");
    const userId = (formData.get("userId") as string) || "";
    const userName = (formData.get("userName") as string) || "";
    const userPhone = (formData.get("userPhone") as string) || "";
    const qualifyingEvent = (formData.get("qualifyingEvent") as string) || "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!proofType || typeof proofType !== "string") {
      return NextResponse.json({ error: "proofType is required" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP, or PDF files are allowed" }, { status: 400 });
    }

    // Use dedicated visitor proof folder if configured, then event folder, then generic folder
    const folderId =
      process.env.GOOGLE_DRIVE_VISITOR_PROOF_FOLDER_ID?.trim() ||
      process.env.GOOGLE_DRIVE_EVENT_FOLDER_ID?.trim() ||
      process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

    if (!folderId) {
      return NextResponse.json({ error: "Google Drive folder not configured" }, { status: 500 });
    }

    const drive = getDriveClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Clean user identifiers for readable file naming
    const cleanName = userName ? userName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) : "Visitor";
    const cleanPhone = userPhone ? userPhone.replace(/[^0-9]/g, "") : "";
    const cleanUid = userId ? userId.slice(-8) : "";
    const cleanOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const driveFileName = `VisitorProof_${cleanName}_${cleanPhone || cleanUid}_[${userId}]_${Date.now()}_${cleanOriginal}`;

    const uploadedFile = await drive.files.create({
      requestBody: {
        name: driveFileName,
        description: `Visitor: ${userName} | Phone: ${userPhone} | UID: ${userId} | Event: ${qualifyingEvent}`,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id,name,webViewLink",
    });

    const fileId = uploadedFile.data.id;
    if (!fileId) throw new Error("Google Drive did not return a file ID");

    // Make the uploaded proof accessible to anyone with the link (user & admin)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr) {
      console.warn("Could not set anyone-reader permission on drive file:", permErr);
    }

    const fileUrl =
      uploadedFile.data.webViewLink ||
      `https://drive.google.com/file/d/${fileId}/view`;

    return NextResponse.json({
      success: true,
      fileId,
      name: uploadedFile.data.name,
      fileUrl,
      url: fileUrl,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Visitor proof upload error:", error);
    return NextResponse.json({ error: err?.message || "Failed to upload proof file" }, { status: 500 });
  }
}

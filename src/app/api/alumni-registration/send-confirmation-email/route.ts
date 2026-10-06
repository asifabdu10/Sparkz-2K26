import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  let registrationIdToUpdate = "";
  try {
    const body = await request.json();
    const { email, name, department, passedOutYear, batch, contact, registrationId } = body;
    registrationIdToUpdate = registrationId || "";

    if (!email) return NextResponse.json({ success: false, error: "Email address is required." }, { status: 400 });

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.ABHERI_EMAIL_FROM || `"Sparkz 2K26" <${smtpUser}>`;

    if (!smtpPass) {
      console.error("Missing SMTP_PASS for alumni email delivery.");
      if (registrationIdToUpdate) {
        try {
          const db = getAdminDb();
          await db.collection("alumni_registrations").doc(registrationIdToUpdate).update({
            emailStatus: "failed",
            emailError: "Email service is not configured (missing SMTP_PASS).",
            updatedAt: FieldValue.serverTimestamp(),
          });
        } catch (e) { console.error("Db update error:", e); }
      }
      return NextResponse.json({ success: false, error: "Email service is not configured." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:30px;background:#f5f7fa;color:#222;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;font-size:30px;color:#F3C87A;letter-spacing:2px;">SPARKZ 2K26</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#e0e0e0;">CARMEL COLLEGE OF ENGINEERING &amp; TECHNOLOGY</p>
        </div>
        <div style="background:white;padding:30px;border-radius:0 0 12px 12px;border:1px solid #eee;">
          <h2 style="color:#0f3460;margin-top:0;">Alumni Registration Confirmed</h2>
          <p>Dear <strong>${escapeHtml(name)}</strong>,</p>
          <p>Your alumni registration for <strong>Sparkz 2K26</strong> has been successfully received. We are thrilled to welcome you back!</p>
          <hr style="border:none;border-top:1px solid #eee;margin:25px 0;" />
          <h3 style="color:#0f3460;">Registration Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;font-weight:bold;color:#555;width:40%;">Registration ID</td><td>${escapeHtml(registrationId)}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#555;">Name</td><td>${escapeHtml(name)}</td></tr>
            ${department ? `<tr><td style="padding:8px 0;font-weight:bold;color:#555;">Department</td><td>${escapeHtml(department)}</td></tr>` : ""}
            ${batch ? `<tr><td style="padding:8px 0;font-weight:bold;color:#555;">Batch</td><td>${escapeHtml(batch)}</td></tr>` : ""}
            <tr><td style="padding:8px 0;font-weight:bold;color:#555;">Passed Out Year</td><td>${escapeHtml(passedOutYear)}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#555;">Contact</td><td>${escapeHtml(contact)}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold;color:#555;">Email</td><td>${escapeHtml(email)}</td></tr>
          </table>
          <div style="margin-top:25px;padding:15px;background:#fff8e7;border-left:4px solid #F3C87A;border-radius:4px;">
            <p style="margin:0;font-size:13px;color:#856404;">Please present this email or your Registration ID at the alumni desk.</p>
          </div>
          <p style="margin-top:25px;color:#666;font-size:13px;">Regards,<br /><strong>Sparkz 2K26 Team</strong><br />Carmel College of Engineering &amp; Technology</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: "Sparkz 2K26 - Alumni Registration Confirmation",
      html,
    });

    console.log("Alumni confirmation email sent:", info.messageId);

    if (registrationIdToUpdate) {
      try {
        const db = getAdminDb();
        await db.collection("alumni_registrations").doc(registrationIdToUpdate).update({
          emailStatus: "sent",
          emailSentAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (dbErr) {
        console.error("Failed to update alumni registration emailStatus to sent:", dbErr);
      }
    }

    return NextResponse.json({ success: true, message: "Confirmation email sent.", id: info.messageId });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Alumni email error:", error);

    if (registrationIdToUpdate) {
      try {
        const db = getAdminDb();
        await db.collection("alumni_registrations").doc(registrationIdToUpdate).update({
          emailStatus: "failed",
          emailError: err?.message || "Failed to send confirmation email.",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (dbErr) {
        console.error("Failed to update alumni registration emailStatus to failed:", dbErr);
      }
    }

    return NextResponse.json({ success: false, error: err?.message || "Failed to send confirmation email." }, { status: 500 });
  }
}

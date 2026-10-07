import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const {
      email,
      name,
      college,
      department,
      yearOfStudy,
      referringType,
      referringName,
      registrationId,
      amountPaid = "₹250",
      paymentId = "",
      passValidity = "08 & 09 Oct",
      collegeIdFileUrl,
      collegeIdFileId,
      referringIdFileUrl,
      referringIdFileId,
    } = body;
    registrationIdToUpdate = registrationId || "";

    const idProofLink =
      collegeIdFileUrl ||
      (collegeIdFileId ? `https://drive.google.com/file/d/${collegeIdFileId}/view` : "");

    const referringProofLink =
      referringIdFileUrl ||
      (referringIdFileId ? `https://drive.google.com/file/d/${referringIdFileId}/view` : "");

    if (!email) return NextResponse.json({ success: false, error: "Email address is required." }, { status: 400 });

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.ABHERI_EMAIL_FROM || `"Sparkz 2K26" <${smtpUser}>`;

    if (!smtpPass) {
      console.error("Missing SMTP_PASS for visitor email delivery.");
      return NextResponse.json({ success: false, error: "Email service is not configured." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;background:#f5f7fa;color:#222;">
        <div style="background:linear-gradient(135deg,#131318,#1a1a24,#252535);padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;border-bottom:3px solid #F3C87A;">
          <h1 style="margin:0;font-size:28px;color:#F3C87A;letter-spacing:3px;">SPARKZ 2K26</h1>
          <p style="margin:8px 0 0;font-size:13px;color:#cfcfcf;letter-spacing:1px;">CARMEL COLLEGE OF ENGINEERING &amp; TECHNOLOGY</p>
        </div>

        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="display:inline-block;padding:6px 16px;background:#e8f5e9;color:#2e7d32;font-size:13px;font-weight:bold;border-radius:20px;letter-spacing:0.5px;">
              ✓ VISITOR PASS CONFIRMED
            </span>
            <h2 style="color:#0f172a;margin:12px 0 4px;font-size:22px;">Welcome to Sparkz 2K26!</h2>
            <p style="color:#64748b;font-size:14px;margin:0;">Dear <strong>${escapeHtml(name)}</strong>, your visitor pass is active and confirmed.</p>
          </div>

          <!-- Highlighted Validity Box (08 & 09 Oct) -->
          <div style="background:linear-gradient(135deg,#fffdf5,#fff8e7);border:2px dashed #F3C87A;border-radius:10px;padding:18px 20px;margin:24px 0;text-align:center;">
            <div style="font-size:11px;color:#92400e;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
              Official Pass Validity
            </div>
            <div style="font-size:22px;font-weight:bold;color:#1e293b;letter-spacing:0.5px;">
              Valid for 08 &amp; 09 Oct
            </div>
            <div style="font-size:13px;color:#b45309;margin-top:4px;font-weight:500;">
              Day 1: Abheri &bull; Day 2: Proshow
            </div>
          </div>

          <h3 style="color:#0f172a;font-size:16px;margin:24px 0 12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
            Registration &amp; Ticket Summary
          </h3>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;width:42%;">Pass ID</td>
              <td style="padding:10px 0;color:#0f172a;font-family:monospace;font-weight:bold;">${escapeHtml(registrationId)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Visitor Name</td>
              <td style="padding:10px 0;color:#0f172a;font-weight:bold;">${escapeHtml(name)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">College</td>
              <td style="padding:10px 0;color:#0f172a;">${escapeHtml(college)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Department</td>
              <td style="padding:10px 0;color:#0f172a;">${escapeHtml(department)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Year of Study</td>
              <td style="padding:10px 0;color:#0f172a;font-weight:600;">${escapeHtml(yearOfStudy || "N/A")}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Pass Validity Dates</td>
              <td style="padding:10px 0;color:#15803d;font-weight:bold;">${escapeHtml(passValidity)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Registration Fee</td>
              <td style="padding:10px 0;color:#0f172a;font-weight:bold;">${escapeHtml(amountPaid)} (Paid)</td>
            </tr>
            ${
              paymentId
                ? `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Payment ID</td>
              <td style="padding:10px 0;color:#0f172a;font-family:monospace;font-size:12px;">${escapeHtml(paymentId)}</td>
            </tr>`
                : ""
            }
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Referred By</td>
              <td style="padding:10px 0;color:#0f172a;">${escapeHtml(referringName)} (${escapeHtml(referringType)})</td>
            </tr>
            ${
              idProofLink
                ? `
            <tr>
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Uploaded ID Proof</td>
              <td style="padding:10px 0;">
                <a href="${escapeHtml(idProofLink)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:bold;text-decoration:underline;">
                  View Uploaded ID Proof &rarr;
                </a>
              </td>
            </tr>`
                : ""
            }
            ${
              referringProofLink
                ? `
            <tr>
              <td style="padding:10px 0;font-weight:600;color:#64748b;">Referee ID Proof</td>
              <td style="padding:10px 0;">
                <a href="${escapeHtml(referringProofLink)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:bold;text-decoration:underline;">
                  View Referee ID Proof &rarr;
                </a>
              </td>
            </tr>`
                : ""
            }
          </table>

          ${
            idProofLink
              ? `
          <!-- ID Proof Quick Access Card -->
          <div style="margin:20px 0;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#334155;font-weight:600;">Uploaded College ID Proof:</p>
            <a href="${escapeHtml(idProofLink)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 20px;background:#1e293b;color:#F3C87A;font-size:12px;font-weight:bold;text-decoration:none;border-radius:6px;letter-spacing:0.5px;">
              📄 View Uploaded ID Card
            </a>
          </div>`
              : ""
          }

          <div style="margin-top:28px;padding:16px;background:#f8fafc;border-left:4px solid #F3C87A;border-radius:6px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#0f172a;">Entry Instructions:</p>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:#475569;line-height:1.6;">
              <li>This pass is strictly valid for <strong>08 &amp; 09 Oct</strong>.</li>
              <li>You <strong>must bring and produce your original College ID card</strong> at the security entrance.</li>
              <li>Please keep this confirmation email or your Pass ID ready on your mobile device for verification.</li>
              <li>Passes are non-transferable and subject to CCET campus security rules.</li>
            </ul>
          </div>

          <p style="margin-top:28px;color:#64748b;font-size:13px;line-height:1.5;">
            Warm regards,<br />
            <strong>Sparkz 2K26 Team</strong><br />
            Carmel College of Engineering &amp; Technology, Punnapra
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: "Sparkz 2K26 - Visitor Pass Confirmed (Valid for 08 & 09 Oct)",
      html,
    });

    if (registrationId) {
      try {
        const db = getAdminDb();
        await db.collection("visitor_registrations").doc(registrationId).update({
          emailStatus: "sent",
          emailSentAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (dbErr) {
        console.error("Failed to update visitor registration emailStatus in db:", dbErr);
      }
    }

    console.log("Visitor confirmation email sent:", info.messageId);
    return NextResponse.json({ success: true, message: "Confirmation email sent.", id: info.messageId });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Visitor email error:", error);

    if (registrationIdToUpdate) {
      try {
        const db = getAdminDb();
        await db.collection("visitor_registrations").doc(registrationIdToUpdate).update({
          emailStatus: "failed",
          emailError: err?.message || "Failed to send confirmation email.",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (dbErr) {
        console.error("Failed to update visitor registration emailStatus to failed:", dbErr);
      }
    }

    return NextResponse.json({ success: false, error: err?.message || "Failed to send confirmation email." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * pdf-lib StandardFonts (Helvetica) only supports WinAnsi / Latin-1 encoding.
 * Any characters outside this range (like ₹, emojis, non-Latin scripts) throw an uncaught WinAnsi exception.
 */
function cleanPdfText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/₹/g, "Rs. ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resend strictly requires "Sender Name <email@domain.com>" or "email@domain.com".
 * Strips any surrounding or double quotes from name and email.
 */
function cleanFromEmail(raw: string | undefined): string {
  const fallback = "Sparkz 2K26 <sparkz@carmelcet.in>";
  if (!raw || !raw.trim()) return fallback;
  const trimmed = raw.trim();

  const angleMatch = trimmed.match(/^(?:["']*(.*?)["']*\s*)?<([^>]+)>$/);
  if (angleMatch) {
    const name = angleMatch[1]?.replace(/^["']+|["']+$/g, "").trim();
    const email = angleMatch[2]?.replace(/^["']+|["']+$/g, "").trim();
    return name ? `${name} <${email}>` : email;
  }

  const cleaned = trimmed.replace(/^["']+|["']+$/g, "");
  return cleaned || fallback;
}

async function qrPng(data: string): Promise<Uint8Array | null> {
  const encoded = encodeURIComponent(data);
  const primaryUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
  try {
    const response = await fetch(primaryUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
  } catch (err) {
    console.warn("Primary QR generation failed, trying fallback:", err);
  }

  const fallbackUrl = `https://quickchart.io/qr?size=300&text=${encoded}`;
  try {
    const response = await fetch(fallbackUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
  } catch (err) {
    console.warn("Fallback QR generation failed:", err);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body?.event;
    const registration = body?.registration;
    const registrationId = String(body?.registrationId || "").trim();

    if (!event || !registration || !registrationId) {
      return NextResponse.json({ error: "Event, registration and registration ID are required." }, { status: 400 });
    }

    const isSpot =
      event.registrationMode === "spot" ||
      event.spotRegistrationOpen === true ||
      event.spotRegistration === true;

    if (!isSpot) {
      return NextResponse.json({ error: "This event is not configured for spot registration." }, { status: 400 });
    }

    const email = String(
      registration.userEmail ||
      registration.leaderEmail ||
      registration.email ||
      ""
    ).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "A valid registrant email is required." }, { status: 400 });
    }

    const ticketNumber = `SPKZ-${cleanPdfText(String(event.id)).slice(0, 8).toUpperCase()}-${cleanPdfText(registrationId).slice(-6).toUpperCase()}`;
    const qrData = `SPARKZ2K26|${ticketNumber}|${event.id}|${registrationId}`;

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([720, 330]);
    const { width, height } = page.getSize();

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.043, 0.047, 0.063) });
    page.drawRectangle({ x: 24, y: 30, width: width - 48, height: height - 60, color: rgb(0.12, 0.15, 0.19), borderColor: rgb(0.3, 0.32, 0.36), borderWidth: 1 });
    page.drawText("CARMEL CET  *  SPARKZ '26", { x: 48, y: height - 72, font: bold, size: 10, color: rgb(1, 0.27, 0.05) });
    page.drawText(cleanPdfText(event.title || "EVENT").slice(0, 38), { x: 48, y: height - 112, font: bold, size: 25, color: rgb(1, 1, 1) });

    const attendee = cleanPdfText(registration.leaderName || registration.userName || "Attendee");
    const rawDate = String(event.startDate || event.date || "TBA") + (event.endDate && event.endDate !== (event.startDate || event.date) ? ` - ${event.endDate}` : "");
    const date = cleanPdfText(rawDate);
    const venue = cleanPdfText(event.venue || "Venue TBA");
    const rows = [
      ["ATTENDEE", attendee],
      ["DATE", date],
      ["VENUE", venue],
      ["REGISTRATION", "SPOT / ON-SITE"],
    ];
    rows.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 48 + col * 275;
      const y = height - 155 - row * 62;
      page.drawText(label, { x, y, font: regular, size: 8, color: rgb(0.75, 0.77, 0.8) });
      page.drawText(String(value).slice(0, 38), { x, y: y - 17, font: bold, size: 11, color: rgb(1, 1, 1) });
    });

    page.drawLine({ start: { x: 545, y: 45 }, end: { x: 545, y: height - 45 }, thickness: 1, color: rgb(0.45, 0.45, 0.48), dashArray: [5, 5] });

    const qrBytes = await qrPng(qrData);
    if (qrBytes) {
      try {
        const qr = await pdf.embedPng(qrBytes);
        page.drawRectangle({ x: 590, y: 112, width: 92, height: 92, color: rgb(1, 1, 1) });
        page.drawImage(qr, { x: 596, y: 118, width: 80, height: 80 });
      } catch (qrEmbedErr) {
        console.warn("Failed to embed QR code PNG into ticket:", qrEmbedErr);
      }
    } else {
      page.drawRectangle({ x: 590, y: 112, width: 92, height: 92, color: rgb(0.18, 0.22, 0.27), borderColor: rgb(0.4, 0.42, 0.46), borderWidth: 1 });
      page.drawText("VALID TICKET", { x: 600, y: 155, font: bold, size: 8, color: rgb(1, 0.75, 0.3) });
      page.drawText("SPARKZ '26", { x: 605, y: 135, font: regular, size: 8, color: rgb(0.8, 0.8, 0.8) });
    }

    page.drawText("ADMIT ONE", { x: 607, y: 92, font: bold, size: 8, color: rgb(0.75, 0.77, 0.8) });
    page.drawText(`#${ticketNumber}`, { x: 590, y: 75, font: bold, size: 7, color: rgb(1, 1, 1) });

    const members = Array.isArray(registration.teamMembers) ? registration.teamMembers : [];
    if (members.length > 0) {
      const roster = pdf.addPage([720, Math.max(420, 180 + members.length * 34)]);
      roster.drawRectangle({ x: 0, y: 0, width: 720, height: roster.getHeight(), color: rgb(0.043, 0.047, 0.063) });
      roster.drawText("SPARKZ '26 - TEAM ROSTER", { x: 45, y: roster.getHeight() - 55, font: bold, size: 20, color: rgb(1, 0.27, 0.05) });
      roster.drawText(cleanPdfText(event.title || "Event"), { x: 45, y: roster.getHeight() - 80, font: regular, size: 11, color: rgb(0.78, 0.79, 0.82) });
      roster.drawText(`Ticket: ${ticketNumber}`, { x: 45, y: roster.getHeight() - 100, font: regular, size: 9, color: rgb(0.78, 0.79, 0.82) });
      let y = roster.getHeight() - 140;
      const leaderLine = `1. ${attendee}`;
      roster.drawText(leaderLine.slice(0, 90), { x: 50, y, font: bold, size: 11, color: rgb(1, 1, 1) });
      y -= 28;
      members.forEach((member: Record<string, unknown>, index: number) => {
        const name = cleanPdfText(member?.name || `Member ${index + 2}`);
        const details = Object.entries(member || {})
          .filter(([k]) => k !== "name")
          .map(([k, v]) => `${cleanPdfText(k)}: ${cleanPdfText(v)}`)
          .join(" * ");
        roster.drawText(`${index + 2}. ${name}`.slice(0, 90), { x: 50, y, font: bold, size: 10, color: rgb(1, 1, 1) });
        y -= 15;
        if (details) {
          roster.drawText(details.slice(0, 100), { x: 68, y, font: regular, size: 8, color: rgb(0.72, 0.74, 0.78) });
          y -= 20;
        } else {
          y -= 8;
        }
      });
    }

    const pdfBytes = await pdf.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    const apiKey = process.env.RESEND_API_KEY;
    const smtpPass = process.env.SMTP_PASS;

    if (!apiKey && !smtpPass) {
      console.error("Missing email configuration: neither SMTP_PASS nor RESEND_API_KEY is configured.");
      return NextResponse.json(
        { error: "Email service is not configured (missing SMTP_PASS and RESEND_API_KEY). Registration was saved, but ticket email is unavailable." },
        { status: 500 }
      );
    }

    const teamNames = [attendee, ...members.map((m: Record<string, unknown>) => cleanPdfText(m?.name || ""))].filter(Boolean);
    const emailSubject = `SPARKZ '26 Spot Registration — ${cleanPdfText(event.title) || "Ticket"}`;
    const attachmentFilename = `${String(event.title || "SPARKZ_Ticket").replace(/[^a-zA-Z0-9_-]/g, "_")}_Ticket.pdf`;

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;background:#0b0c10;color:#fff;padding:30px">
        <h1 style="color:#ff4500">SPARKZ '26 — Spot Registration Confirmed</h1>
        <p>Your spot registration for <strong>${escapeHtml(event.title)}</strong> is confirmed.</p>
        <table cellpadding="8" style="border-collapse:collapse">
          <tr><td><b>Date</b></td><td>${escapeHtml(event.startDate || event.date || "TBA")}${event.endDate && event.endDate !== (event.startDate || event.date) ? ` – ${escapeHtml(event.endDate)}` : ""}</td></tr>
          <tr><td><b>Venue</b></td><td>${escapeHtml(event.venue || "TBA")}</td></tr>
          <tr><td><b>Registration Desk</b></td><td>${escapeHtml(event.spotRegistrationDesk || "Registration Desk")}</td></tr>
          <tr><td><b>Ticket</b></td><td>${escapeHtml(ticketNumber)}</td></tr>
        </table>
        <h3>Team Members</h3>
        <ul>${teamNames.map((name: string) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>
        <p>The event ticket PDF is attached to this email. Please keep it available at the venue.</p>
      </div>`;

    let emailSent = false;
    let lastError: unknown = null;

    // 1. First choice: Use SMTP (Google Workspace / Gmail App Password) - exact same as Abheri
    if (smtpPass) {
      try {
        const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
        const smtpPort = Number(process.env.SMTP_PORT || 465);
        const smtpUser = process.env.SMTP_USER || "sparkz@carmelcet.in";
        const fromEmail =
          process.env.ABHERI_EMAIL_FROM ||
          process.env.EVENT_EMAIL_FROM ||
          process.env.SMTP_FROM ||
          `"Sparkz 2K26" <sparkz@carmelcet.in>`;

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: fromEmail,
          to: email,
          subject: emailSubject,
          html: emailHtml,
          attachments: [
            {
              filename: attachmentFilename,
              content: Buffer.from(pdfBytes),
              contentType: "application/pdf",
            },
          ],
        });

        emailSent = true;
      } catch (smtpErr) {
        console.error("SMTP sending error in send-spot-ticket:", smtpErr);
        lastError = smtpErr;
      }
    }

    // 2. Fallback: Use Resend if SMTP failed or SMTP_PASS was not provided
    if (!emailSent && apiKey) {
      try {
        const from = cleanFromEmail(process.env.EVENT_EMAIL_FROM || process.env.ABHERI_EMAIL_FROM);
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            from,
            to: [email],
            subject: emailSubject,
            html: emailHtml,
            attachments: [{ filename: attachmentFilename, content: base64 }],
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          const text = await emailResponse.text();
          console.error("Resend delivery failed:", emailResponse.status, text);
          lastError = new Error(`Resend error (${emailResponse.status}): ${text}`);
        }
      } catch (resendErr) {
        console.error("Resend fetch exception:", resendErr);
        lastError = resendErr;
      }
    }

    if (!emailSent) {
      return NextResponse.json({
        error: "Ticket generated, but email delivery failed.",
        details: lastError instanceof Error ? lastError.message : String(lastError || "Unknown email error"),
      }, { status: 502 });
    }

    return NextResponse.json({ success: true, ticketNumber });
  } catch (error) {
    console.error("Spot ticket generation failed:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to generate or send spot ticket.",
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function qrPng(data: string) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("QR code generation failed");
  return new Uint8Array(await response.arrayBuffer());
}

function money(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? `₹${n}` : "FREE";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body?.event;
    const registration = body?.registration;
    const registrationId = String(body?.registrationId || "");

    if (!event || !registration || !registrationId) {
      return NextResponse.json({ error: "Event, registration and registration ID are required." }, { status: 400 });
    }

    if (event.registrationMode !== "spot") {
      return NextResponse.json({ error: "This event is not configured for spot registration." }, { status: 400 });
    }

    const email = String(registration.userEmail || registration.leaderEmail || "").trim();
    if (!email) return NextResponse.json({ error: "Registrant email is required." }, { status: 400 });

    const ticketNumber = `SPKZ-${String(event.id).slice(0, 8).toUpperCase()}-${registrationId.slice(-6).toUpperCase()}`;
    const qrData = `SPARKZ2K26|${ticketNumber}|${event.id}|${registrationId}`;

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([720, 330]);
    const { width, height } = page.getSize();

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.043, 0.047, 0.063) });
    page.drawRectangle({ x: 24, y: 30, width: width - 48, height: height - 60, color: rgb(0.12, 0.15, 0.19), borderColor: rgb(0.3, 0.32, 0.36), borderWidth: 1 });
    page.drawText("CARMEL CET  •  SPARKZ '26", { x: 48, y: height - 72, font: bold, size: 10, color: rgb(1, 0.27, 0.05) });
    page.drawText(String(event.title || "EVENT").slice(0, 38), { x: 48, y: height - 112, font: bold, size: 25, color: rgb(1, 1, 1) });

    const attendee = String(registration.leaderName || registration.userName || "Attendee");
    const date = String(event.startDate || event.date || "TBA") + (event.endDate && event.endDate !== (event.startDate || event.date) ? ` – ${event.endDate}` : "");
    const venue = String(event.venue || "Venue TBA");
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
    const qr = await pdf.embedPng(qrBytes);
    page.drawRectangle({ x: 590, y: 112, width: 92, height: 92, color: rgb(1, 1, 1) });
    page.drawImage(qr, { x: 596, y: 118, width: 80, height: 80 });
    page.drawText("ADMIT ONE", { x: 607, y: 92, font: bold, size: 8, color: rgb(0.75, 0.77, 0.8) });
    page.drawText(`#${ticketNumber}`, { x: 590, y: 75, font: bold, size: 7, color: rgb(1, 1, 1) });

    const members = Array.isArray(registration.teamMembers) ? registration.teamMembers : [];
    if (members.length > 0) {
      const roster = pdf.addPage([720, Math.max(420, 180 + members.length * 34)]);
      roster.drawRectangle({ x: 0, y: 0, width: 720, height: roster.getHeight(), color: rgb(0.043, 0.047, 0.063) });
      roster.drawText("SPARKZ '26 — TEAM ROSTER", { x: 45, y: roster.getHeight() - 55, font: bold, size: 20, color: rgb(1, 0.27, 0.05) });
      roster.drawText(String(event.title || "Event"), { x: 45, y: roster.getHeight() - 80, font: regular, size: 11, color: rgb(0.78, 0.79, 0.82) });
      roster.drawText(`Ticket: ${ticketNumber}`, { x: 45, y: roster.getHeight() - 100, font: regular, size: 9, color: rgb(0.78, 0.79, 0.82) });
      let y = roster.getHeight() - 140;
      const leaderLine = `1. ${attendee}`;
      roster.drawText(leaderLine.slice(0, 90), { x: 50, y, font: bold, size: 11, color: rgb(1, 1, 1) });
      y -= 28;
      members.forEach((member: Record<string, unknown>, index: number) => {
        const name = String(member?.name || `Member ${index + 2}`);
        const details = Object.entries(member || {}).filter(([k]) => k !== "name").map(([k, v]) => `${k}: ${String(v || "")}`).join(" • ");
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
    const from = process.env.EVENT_EMAIL_FROM || process.env.ABHERI_EMAIL_FROM;
    if (!apiKey || !from) {
      return NextResponse.json({ error: "Email service is not configured. Registration can still be completed, but ticket email is unavailable." }, { status: 500 });
    }

    const teamNames = [attendee, ...members.map((m: Record<string, unknown>) => String(m?.name || ""))].filter(Boolean);
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `SPARKZ '26 Spot Registration — ${event.title}`,
        html: emailHtml,
        attachments: [{ filename: `${String(event.title || "SPARKZ_Ticket").replace(/[^a-z0-9_-]/gi, "_")}_Ticket.pdf`, content: base64 }],
      }),
    });

    if (!emailResponse.ok) {
      const text = await emailResponse.text();
      console.error("Resend error:", text);
      return NextResponse.json({ error: "Ticket generated, but email delivery failed." }, { status: 502 });
    }

    return NextResponse.json({ success: true, ticketNumber });
  } catch (error) {
    console.error("Spot ticket generation failed:", error);
    return NextResponse.json({ error: "Failed to generate or send spot ticket." }, { status: 500 });
  }
}

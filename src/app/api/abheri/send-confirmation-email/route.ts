import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            email,
            bandName,
            collegeName,
            managerName,
            managerMobile,
            leaderName,
            leaderMobile,
            musiciansCount,
            vocalistCount,
            instrumentalistCount,
            transactionId,
            instruments,
            screenshotUrl,
        } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: "Email address is required." },
                { status: 400 }
            );
        }

        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.ABHERI_EMAIL_FROM;

        if (!apiKey || !fromEmail) {
            console.error(
                "Missing RESEND_API_KEY or ABHERI_EMAIL_FROM environment variable."
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Email service is not configured.",
                },
                { status: 500 }
            );
        }

        const instrumentList = Array.isArray(instruments)
            ? instruments.join(", ")
            : String(instruments ?? "");

        const html = `
      <div style="
        font-family: Arial, Helvetica, sans-serif;
        max-width: 650px;
        margin: 0 auto;
        padding: 30px;
        background: #f5f7fa;
        color: #222;
      ">

        <div style="
          background: #0b4b62;
          padding: 25px;
          text-align: center;
          border-radius: 12px 12px 0 0;
          color: white;
        ">
          <h1 style="margin: 0; font-size: 28px;">
            ABHERI 2K26
          </h1>

          <p style="
            margin: 8px 0 0;
            font-size: 15px;
          ">
            Inter-Collegiate Band Competition
          </p>
        </div>

        <div style="
          background: white;
          padding: 30px;
          border-radius: 0 0 12px 12px;
        ">

          <h2 style="
            color: #0b4b62;
            margin-top: 0;
          ">
            Registration Successful! 🎉
          </h2>

          <p>
            Dear <strong>${escapeHtml(managerName)}</strong>,
          </p>

          <p>
            Your registration for
            <strong>Abheri 2K26 – Battle of Bands</strong>
            has been successfully submitted.
          </p>

          <hr style="
            border: none;
            border-top: 1px solid #ddd;
            margin: 25px 0;
          " />

          <h3 style="color: #0b4b62;">
            Registration Details
          </h3>

          <table style="
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          ">

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Band Name
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(bandName)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                College
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(collegeName)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Manager
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(managerName)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Manager Phone
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(managerMobile)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Leader
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(leaderName)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Leader Phone
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(leaderMobile)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Total Members
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(musiciansCount)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Vocalists
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(vocalistCount)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Instrumentalists
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(instrumentalistCount)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Instruments
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(instrumentList)}
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 0; font-weight: bold;">
                Transaction ID
              </td>
              <td style="padding: 8px 0;">
                ${escapeHtml(transactionId)}
              </td>
            </tr>

          </table>

          ${screenshotUrl
                ? `
                <div style="margin-top: 25px;">
                  <a
                    href="${escapeHtml(screenshotUrl)}"
                    target="_blank"
                    style="
                      display: inline-block;
                      padding: 12px 18px;
                      background: #0b4b62;
                      color: white;
                      text-decoration: none;
                      border-radius: 6px;
                    "
                  >
                    View Payment Screenshot
                  </a>
                </div>
              `
                : ""
            }

          <p style="
            margin-top: 30px;
            line-height: 1.6;
          ">
            Please keep this email for your records.
            Our team will contact you if any additional information
            is required.
          </p>

          <p style="
            margin-top: 25px;
            color: #666;
          ">
            Regards,<br />
            <strong>Sparkz 2K26</strong><br />
            Abheri – Battle of Bands
          </p>

        </div>
      </div>
    `;

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [email],
                subject: "Abheri 2K26 – Registration Successful",
                html,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Resend error:", result);

            return NextResponse.json(
                {
                    success: false,
                    error: result?.message || "Failed to send email.",
                },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Confirmation email sent successfully.",
            id: result?.id,
        });
    } catch (error) {
        console.error("Abheri email error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to send confirmation email.",
            },
            { status: 500 }
        );
    }
}
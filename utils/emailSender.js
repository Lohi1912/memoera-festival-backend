import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendFestivalEmail({ toEmail, userName, festivalName, imageUrl, overlayText }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Happy ${festivalName} from Memoera!</title>
</head>
<body style="margin:0;padding:0;background:#0a1a20;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1a20;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:560px;background:#0f2830;border-radius:18px;overflow:hidden;
                 box-shadow:0 8px 32px rgba(0,0,0,0.5);">

          <!-- Brand header -->
          <tr>
            <td align="center"
              style="padding:24px 32px 18px;background:linear-gradient(135deg,#071C22,#0f3040);">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:50%;background:#071C22;
                  display:flex;align-items:center;justify-content:center;
                  border:1.5px solid rgba(0,201,167,0.4);">
                </div>
                <span style="color:#00C9A7;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Memoera</span>
              </div>
            </td>
          </tr>

          <!-- Festival greeting image -->
          <tr>
            <td style="padding:0;line-height:0;">
              <img src="${imageUrl}" alt="Happy ${festivalName}"
                width="560" style="display:block;width:100%;max-width:560px;height:auto;"/>
            </td>
          </tr>

          <!-- Message body -->
          <tr>
            <td align="center" style="padding:30px 32px 28px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:22px;font-weight:700;
                line-height:1.3;">
                Happy ${festivalName}, ${userName}! 🎉
              </h2>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.62);font-size:14px;
                line-height:1.75;max-width:420px;">
                ${overlayText}
              </p>
              <a href="https://suchithraprints.in"
                style="display:inline-block;background:linear-gradient(135deg,#00C9A7,#00E5CC);
                  color:#040D0B;text-decoration:none;font-weight:700;font-size:14px;
                  padding:13px 30px;border-radius:26px;">
                Open Memoera
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="padding:16px 32px 22px;border-top:1px solid rgba(255,255,255,0.07);">
              <p style="margin:0;color:rgba(255,255,255,0.28);font-size:11px;line-height:1.6;">
                You're receiving this as a Memoera subscriber.<br/>
                © 2025 Memoera · suchithraprints.in
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Memoera Greetings <onboarding@resend.dev>',
    to: toEmail,
    subject: `Happy ${festivalName} from Memoera! 🎉`,
    html,
  });
}

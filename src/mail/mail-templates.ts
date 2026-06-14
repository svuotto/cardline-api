type CodeEmailContent = {
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildVerificationCodeEmail(input: {
  code: string;
  ttlMinutes: number;
  headline: string;
  intro: string;
}): CodeEmailContent {
  const code = escapeHtml(input.code);
  const headline = escapeHtml(input.headline);
  const intro = escapeHtml(input.intro);
  const ttl = escapeHtml(String(input.ttlMinutes));

  return {
    text: [
      input.intro,
      "",
      `Code: ${input.code}`,
      "",
      `This code expires in ${input.ttlMinutes} minutes.`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px 28px;">
            <tr>
              <td style="font-size:22px;font-weight:700;padding-bottom:12px;">${headline}</td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.5;color:#4b5563;padding-bottom:28px;">${intro}</td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <div style="display:inline-block;font-size:40px;font-weight:700;letter-spacing:0.32em;padding:20px 24px;background:#eef4ff;border:1px solid #c7d7fe;border-radius:14px;color:#1d4ed8;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">
                  ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.5;color:#6b7280;padding-bottom:8px;">
                Enter this code in the Cardline app. It expires in ${ttl} minutes.
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.5;color:#9ca3af;">
                If you did not request this email, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export function buildPlainNoticeEmail(input: {
  headline: string;
  body: string;
}): CodeEmailContent {
  const headline = escapeHtml(input.headline);
  const bodyHtml = escapeHtml(input.body).replace(/\n/g, "<br>");

  return {
    text: `${input.headline}\n\n${input.body}`,
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px 28px;">
            <tr>
              <td style="font-size:22px;font-weight:700;padding-bottom:12px;">${headline}</td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.6;color:#4b5563;">${bodyHtml}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

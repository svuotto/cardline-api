import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  constructor(private readonly cfg: ConfigService) {}

  async send(input: SendMailInput): Promise<void> {
    const apiKey = this.cfg.get<string>("RESEND_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException("Email delivery is not configured");
    }

    const from =
      this.cfg.get<string>("MAIL_FROM")?.trim()
      ?? "Cardline <onboarding@resend.dev>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend API error:", response.status, detail);
      throw new ServiceUnavailableException("Could not send email");
    }
  }
}

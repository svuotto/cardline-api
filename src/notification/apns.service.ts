import apn from "@parse/node-apn";
import { Injectable } from "@nestjs/common";

@Injectable()
export class APNSService {

  private provider: apn.Provider | null = null;

  constructor() {
    const keyPath = process.env.APNS_PRIVATE_KEY_PATH;
    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;

    if (!keyPath || !keyId || !teamId) {
      return;
    }

    this.provider = new apn.Provider({
      token: {
        key: keyPath,
        keyId,
        teamId,
      },

      production:
        process.env.NODE_ENV === "production",
    });
  }

  async sendPush(input: {
    token: string;
    title: string;
    body: string;
    badge?: number;
    payload?: Record<string, any>;
  }) {

    const note = new apn.Notification();

    note.topic = process.env.APNS_BUNDLE_ID!;

    note.alert = {
      title: input.title,
      body: input.body,
    };

    note.sound = "default";

    if (input.badge != null && input.badge >= 0) {
      note.badge = input.badge;
    }

    note.payload = input.payload ?? {};

    if (!this.provider) {
      return { sent: [], failed: [] };
    }

    return this.provider.send(
      note,
      input.token,
    );
  }
}
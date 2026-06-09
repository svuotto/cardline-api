import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppStoreServerAPIClient, Environment, } from "@apple/app-store-server-library";
import { SubscriptionService } from "./subscription.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class SubscriptionReplayService {
  private readonly logger = new Logger(SubscriptionReplayService.name);
  private readonly client?: AppStoreServerAPIClient;

  constructor(
    private readonly cfg: ConfigService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    const keyId = this.cfg.get<string>("APPLE_API_KEY_ID");
    const issuerId = this.cfg.get<string>("APPLE_API_ISSUER_ID");
    const bundleId = this.cfg.get<string>("APPLE_IAP_BUNDLE_ID");
    const privateKey = this.cfg.get<string>("APPLE_API_PRIVATE_KEY");

    // 👉 Falls noch kein Key vorhanden → Replay deaktivieren
    if (!keyId || !issuerId || !bundleId || !privateKey) {
      this.logger.warn("Apple Replay disabled (missing API credentials)");
      return;
    }

    const envRaw = (this.cfg.get<string>("APPLE_IAP_ENVIRONMENT") ?? "Sandbox").toLowerCase();

    const environment =
      envRaw === "production"
        ? Environment.PRODUCTION
        : Environment.SANDBOX;

    this.client = new AppStoreServerAPIClient(
      privateKey,
      keyId,
      issuerId,
      bundleId,
      environment,
    );
  }

  async replayNotifications(startDate: Date) {
    if (!this.client) {
      this.logger.warn("Replay skipped (no Apple API client configured)");
      return;
    }

    this.logger.log(`Replay started from ${startDate.toISOString()}`);

    let hasMore = true;
    let paginationToken: string | null | undefined;

    while (hasMore) {
      const response = await this.client.getNotificationHistory(
        paginationToken ?? null,
        {
          startDate: startDate.getTime(),
          endDate: Date.now(),
        },
      );

      const notifications = (response.notificationHistory ?? []) as Array<{
        signedPayload?: string;
      }>;

      if (!notifications.length) {
        this.logger.log("No more notifications");
        break;
      }

      for (const n of notifications) {
        if (!n?.signedPayload) continue;

        try {
          await this.subscriptionService.handleAppleNotification(
            n.signedPayload,
          );
        } catch (err) {
          this.logger.error("Replay failed for notification", err);
        }
      }

      paginationToken = response.paginationToken ?? undefined;
      hasMore = !!paginationToken;
    }

    this.logger.log("Replay finished");
  }

  // ✅ Automatischer Recovery Job
  @Cron(CronExpression.EVERY_HOUR)
  async handleReplayCron() {
    this.logger.log("Running scheduled replay job");

    await this.replayNotifications(
      new Date(Date.now() - 1000 * 60 * 60), // letzte Stunde
    );
  }
}
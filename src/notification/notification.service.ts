import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { NotificationEntity } from "./notification.entity";
import { PushTokenEntity } from "./user-push-token.entity";
import { UserNotificationPreferenceEntity } from "./user-notification-preference.entity";
import { RegisterPushTokenInput } from "./register-push-token.input";
import { UpdateNotificationPreferencesInput } from "./update-notification-preferences.input";
import { APNSService } from "./apns.service";
import {
  ESSENTIAL_NOTIFICATION_TYPES,
  NEW_PRODUCT_NOTIFICATION_TYPES,
  TIER_DECK_NOTIFICATION_TYPES,
} from "./notification-type-groups";
import { AppUserEntity } from "../user/user.entity";
import {
  getDevTestSystemCopy,
  getNotificationCopy,
  resolveNotificationLocale,
} from "./notification-copy";
import {
  CreateForUserInput,
  isCreateForUserWithCopy,
} from "./create-for-user.input";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,

    @InjectRepository(PushTokenEntity)
    private readonly pushTokenRepo: Repository<PushTokenEntity>,

    @InjectRepository(UserNotificationPreferenceEntity)
    private readonly preferenceRepo: Repository<UserNotificationPreferenceEntity>,

    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,

    private readonly apnsService: APNSService,
  ) {}

  async getPreferences(userUid: string) {
    const row = await this.ensurePreferences(userUid);
    return this.preferencesToDto(row);
  }

  async updatePreferences(
    userUid: string,
    dto: UpdateNotificationPreferencesInput,
  ) {
    const row = await this.ensurePreferences(userUid);
    row.notifyNewProducts = dto.notifyNewProducts;
    row.notifyTierDecks = dto.notifyTierDecks;
    await this.preferenceRepo.save(row);
    return this.preferencesToDto(row);
  }

  private async ensurePreferences(userUid: string) {
    const existing = await this.preferenceRepo.findOne({
      where: { userUid },
    });

    if (existing) {
      return existing;
    }

    const created = this.preferenceRepo.create({
      userUid,
      notifyNewProducts: true,
      notifyTierDecks: true,
    });

    return this.preferenceRepo.save(created);
  }

  private preferencesToDto(row: UserNotificationPreferenceEntity) {
    return {
      notifyNewProducts: row.notifyNewProducts,
      notifyTierDecks: row.notifyTierDecks,
    };
  }

  private async shouldDeliverPush(userUid: string, type: string): Promise<boolean> {
    if (ESSENTIAL_NOTIFICATION_TYPES.has(type)) {
      return true;
    }

    const prefs = await this.ensurePreferences(userUid);

    if (NEW_PRODUCT_NOTIFICATION_TYPES.has(type)) {
      return prefs.notifyNewProducts;
    }

    if (TIER_DECK_NOTIFICATION_TYPES.has(type)) {
      return prefs.notifyTierDecks;
    }

    // Future categories stay enabled until dedicated toggles ship.
    return true;
  }

  async getMine(userUid: string) {
    const rows = await this.repo.find({
      where: { userUid },
      order: { createdAt: "DESC" },
      take: 100,
    });

    return rows.map(this.toDto);
  }

  async getUnreadCount(userUid: string) {
    const count = await this.repo.count({
      where: {
        userUid,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  async markRead(userUid: string, notificationUid: string) {
    await this.repo.update(
      {
        userUid,
        notificationUid: notificationUid,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    return { ok: true };
  }

  async markAllRead(userUid: string) {
    await this.repo.update(
      {
        userUid,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    return { ok: true };
  }

  async registerPushToken(userUid: string, dto: RegisterPushTokenInput,): Promise<{ ok: true }> {
    const existing = await this.pushTokenRepo.findOne({
      where: { pushToken: dto.pushToken },
    });

    if (existing) {
      await this.applyPushTokenRegistration(existing, userUid, dto);
      return { ok: true };
    }

    const row = this.pushTokenRepo.create({
      pushTokenUid: randomUUID(),
      userUid,
      pushToken: dto.pushToken,
      platform: dto.platform,
      deviceId: null,
      isActive: true,
      deviceLabel: dto.deviceLabel ?? null,
      lastSeenAt: new Date(),
    });

    try {
      await this.pushTokenRepo.save(row);
    } catch (error) {
      // Parallel register calls (e.g. app launch + settings) can race on ux_user_push_token_push_token.
      if (!this.isPushTokenUniqueViolation(error)) {
        throw error;
      }

      const raced = await this.pushTokenRepo.findOne({
        where: { pushToken: dto.pushToken },
      });

      if (!raced) {
        throw error;
      }

      await this.applyPushTokenRegistration(raced, userUid, dto);
    }

    return { ok: true };
  }

  private async applyPushTokenRegistration(
    row: PushTokenEntity,
    userUid: string,
    dto: RegisterPushTokenInput,
  ): Promise<void> {
    row.userUid = userUid;
    row.platform = dto.platform;
    row.isActive = true;
    row.deviceLabel = dto.deviceLabel ?? null;
    row.lastSeenAt = new Date();
    await this.pushTokenRepo.save(row);
  }

  private isPushTokenUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === "23505"
    );
  }

  async deactivatePushToken(
    pushToken: string,
  ): Promise<void> {

    await this.pushTokenRepo.update(
      {
        pushToken,
      },
      {
        isActive: false,
      },
    );
  }

  private defaultExpiresAt(type: string): Date {
    const now = new Date();

    const days = [
        "system",
        "new_cards",
        "maintenance",
        "premium"
      ].includes(type)
        ? 30
        : 90;

    now.setDate(now.getDate() + days);

    return now;
  }

  private async resolveLocalizedCopy(input: CreateForUserInput) {
    if (!isCreateForUserWithCopy(input)) {
      return {
        title: input.title,
        body: input.body,
        locale: undefined as string | undefined,
      };
    }

    const user = await this.userRepo.findOneByOrFail({ userUid: input.userUid });
    const locale = resolveNotificationLocale(
      user.preferredAppLang,
      user.effectiveAppLang,
    );
    const copy = getNotificationCopy(
      input.copyKey,
      locale,
      input.templateArgs ?? {},
    );

    return {
      title: copy.title,
      body: copy.body,
      locale,
    };
  }

  async createForUser(input: CreateForUserInput) {
    const { title, body, locale } = await this.resolveLocalizedCopy(input);
    const metadata =
      locale != null
        ? { ...input.metadata, locale }
        : (input.metadata ?? {});
    const row = this.repo.create({
      notificationUid: randomUUID(),
      userUid: input.userUid,
      notificationType: input.type,
      notificationPriority: input.priority ?? "normal",
      title,
      body,
      imageUrl: input.imageUrl ?? null,
      deepLink: input.deepLink ?? null,
      metadata,
      isRead: false,
      readAt: null,
      deliveredPush: false,
      createdAt: new Date(),
      expiresAt: this.defaultExpiresAt(input.type),
    });

    await this.repo.save(row);

    const deliverPush = await this.shouldDeliverPush(input.userUid, input.type);

    if (!deliverPush) {
      return this.toDto(row);
    }

    const pushTokens = await this.pushTokenRepo.find({
      where: {
        userUid: input.userUid,
        isActive: true,
      },
    });

    const unreadCount = await this.repo.count({
      where: {
        userUid: input.userUid,
        isRead: false,
      },
    });

    let pushDelivered = false;

    for (const token of pushTokens) {

      const result = await this.apnsService.sendPush({
        token: token.pushToken,
        title,
        body,
        badge: unreadCount,
        payload: {
          notificationUid: row.notificationUid,
          deepLink: input.deepLink ?? null,
          unreadCount,
        },
      });

      // success

      if (!result.failed?.length) {
        pushDelivered = true;
      }

      // invalid token cleanup

      if (result.failed?.length) {

        const firstFailure = result.failed[0];

        console.log("APNS FAILURE:", firstFailure);

        const reason =
          firstFailure.response?.reason;

        if (
          reason === "BadDeviceToken" ||
          reason === "Unregistered"
        ) {
          token.isActive = false;

          await this.pushTokenRepo.save(token);
        }
      }
    }

    if (pushDelivered) {

      row.deliveredPush = true;

      await this.repo.save(row);
    }

    return this.toDto(row);
  }

  private toDto(row: NotificationEntity) {
    return {
      notificationUid: row.notificationUid,
      userUid: row.userUid,
      notificationType: row.notificationType,
      notificationPriority: row.notificationPriority,
      title: row.title,
      body: row.body,
      imageUrl: row.imageUrl,
      deepLink: row.deepLink,
      metadata: row.metadata ?? {},
      isRead: row.isRead,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      deliveredPush: row.deliveredPush,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    };
  }

  // --- DEV TEST ONLY (nur für Testzwecke, später löschen) ---

  async sendDevTestNotification(userUid: string) {
    if (!isNotificationDevEnabled()) {
      throw new ForbiddenException();
    }

    const user = await this.userRepo.findOneByOrFail({ userUid });
    const locale = resolveNotificationLocale(
      user.preferredAppLang,
      user.effectiveAppLang,
    );
    const copy = getDevTestSystemCopy(locale);

    return this.createForUser({
      userUid,
      type: "system",
      priority: "normal",
      title: copy.title,
      body: copy.body,
      deepLink: "cardline://notifications",
      metadata: {
        source: "dev_test",
        locale,
      },
    });
  }
}

function isNotificationDevEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.ENABLE_NOTIFICATION_DEV !== "false";
}
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Environment, SignedDataVerifier, VerificationException } from "@apple/app-store-server-library";
import { AppUserEntity } from "../user/user.entity";
import { UserSubscriptionEntity } from "./user-subscription.entity";
import { ActivateAppleSubscriptionDto } from "./subscription.dto";

@Injectable()
export class SubscriptionService {

  private readonly verifier: SignedDataVerifier;

  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptionRepo: Repository<UserSubscriptionEntity>,
  ) {
    const bundleId = this.cfg.get<string>("APPLE_IAP_BUNDLE_ID");
    if (!bundleId) {
      throw new Error("Missing APPLE_IAP_BUNDLE_ID");
    }

    const envRaw = (this.cfg.get<string>("APPLE_IAP_ENVIRONMENT") ?? "Sandbox").toLowerCase();
    const environment =
      envRaw === "production" ? Environment.PRODUCTION : Environment.SANDBOX;

    const appAppleIdRaw = this.cfg.get<string>("APPLE_APP_ID");
    const appAppleId =
      environment === Environment.PRODUCTION && appAppleIdRaw
        ? Number(appAppleIdRaw)
        : undefined;

    const appleRootCertificates = this.loadAppleRootCertificates();

    this.verifier = new SignedDataVerifier(
      appleRootCertificates,
      true,
      environment,
      bundleId,
      appAppleId,
    );
  }

  async activateAppleSubscription(userUid: string, dto: ActivateAppleSubscriptionDto) {
    const user = await this.userRepo.findOne({ where: { userUid } });
    if (!user) throw new NotFoundException("User not found");

    if (user.appAccountToken !== dto.appAccountToken) {
      throw new BadRequestException("Invalid app account token.");
    }

    const purchaseDate = new Date(dto.purchaseDate);
    const expirationDate = new Date(dto.expirationDate);
    const revocationDate = dto.revocationDate ? new Date(dto.revocationDate) : null;

    if (Number.isNaN(purchaseDate.getTime())) {
      throw new BadRequestException("Invalid purchaseDate");
    }

    if (Number.isNaN(expirationDate.getTime())) {
      throw new BadRequestException("Invalid expirationDate");
    }

    if (revocationDate && Number.isNaN(revocationDate.getTime())) {
      throw new BadRequestException("Invalid revocationDate");
    }

    const tier = this.mapAppleProductToTier(dto.productId);
    const now = new Date();

    const isRevoked = !!revocationDate;
    const isExpired = expirationDate.getTime() <= now.getTime();

    let status:
      | "active"
      | "grace_period"
      | "billing_retry"
      | "cancelled"
      | "expired"
      | "revoked";

    if (!!revocationDate) {
      status = "revoked";
    } else if (expirationDate.getTime() <= now.getTime()) {
      status = "expired";
    } else {
      status = "active";
    }

    if (dto.originalTransactionId) {
      const existingByOriginal = await this.subscriptionRepo.findOne({
        where: {
          provider: "apple",
          providerOriginalTransactionId: dto.originalTransactionId,
        },
        order: {
          createdAt: "DESC",
        },
      });

      if (existingByOriginal && existingByOriginal.userUid !== userUid) {
        throw new BadRequestException("This subscription is already linked to another account.");
      }
    }

    const existingByTransaction = await this.subscriptionRepo.findOne({
      where: {
        provider: "apple",
        providerTransactionId: dto.transactionId,
      },
    });

    if (status === "active" && this.isPremiumActive(user)) {
      const latestUserSub = await this.subscriptionRepo.findOne({
        where: { userUid, provider: "apple" },
        order: { expiresAt: "DESC" },
      });

      const isSamePurchaseChain =
        !!dto.originalTransactionId &&
        latestUserSub?.providerOriginalTransactionId === dto.originalTransactionId;

      const isKnownTransaction = existingByTransaction?.userUid === userUid;

      if (!isSamePurchaseChain && !isKnownTransaction) {
        throw new BadRequestException(
          "This account already has an active subscription.",
        );
      }
    }

    if (existingByTransaction && existingByTransaction.userUid !== userUid) {
      throw new BadRequestException("This transaction is already linked to another account.");
    }

    let row = await this.subscriptionRepo.findOne({
      where: {
        provider: "apple",
        providerTransactionId: dto.transactionId,
      },
    });

    if (!row) {
      row = this.subscriptionRepo.create({
        userUid,
        provider: "apple",
        providerOriginalTransactionId: dto.originalTransactionId ?? null,
        providerTransactionId: dto.transactionId,
        appAccountToken: dto.appAccountToken,
        tier,
        startsAt: purchaseDate,
        expiresAt: expirationDate,
        autoRenews: false,
        status,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      row.providerOriginalTransactionId = dto.originalTransactionId ?? row.providerOriginalTransactionId;
      row.appAccountToken = dto.appAccountToken;
      row.tier = tier;
      row.startsAt = purchaseDate;
      row.expiresAt = expirationDate;
      row.status = status;
      row.updatedAt = now;
    }

    await this.subscriptionRepo.save(row);
    await this.syncUserEntitlement(userUid);

    user.subscriptionTier = tier;
    user.subscriptionExpiresAt = expirationDate;
    user.subscriptionProvider = "apple";

    await this.userRepo.save(user);

    return {
      ok: true,
      subscription: {
        provider: "apple",
        tier,
        expiresAt: expirationDate,
        status,
      },
    };
  }

  async handleAppleNotification(signedPayload: string) {
    let decodedNotification: any;

    try {
      decodedNotification = await this.verifier.verifyAndDecodeNotification(signedPayload);
    } catch (error) {
      if (error instanceof VerificationException) {
        throw new BadRequestException("Invalid Apple notification signature");
      }
      throw error;
    }

    const notificationType = decodedNotification.notificationType as string | undefined;
    const subtype = decodedNotification.subtype as string | undefined;
    const data = decodedNotification.data;

    if (!data?.signedTransactionInfo) {
      return {
        ok: true,
        ignored: true,
        reason: "No signedTransactionInfo in notification",
        notificationType,
        subtype,
      };
    }

    const transaction = await this.verifier.verifyAndDecodeTransaction(data.signedTransactionInfo);

    const renewalInfo = data.signedRenewalInfo
      ? await this.verifier.verifyAndDecodeRenewalInfo(data.signedRenewalInfo)
      : null;

    const transactionId = transaction.transactionId ? String(transaction.transactionId) : null;
    const originalTransactionId = transaction.originalTransactionId
      ? String(transaction.originalTransactionId)
      : null;
    const productId = transaction.productId ? String(transaction.productId) : null;

    if (!transactionId || !productId) {
      throw new BadRequestException("Missing Apple transaction fields in notification");
    }

    const purchaseDate = transaction.purchaseDate
      ? new Date(Number(transaction.purchaseDate))
      : new Date();

    const expiresDate = transaction.expiresDate
      ? new Date(Number(transaction.expiresDate))
      : null;

    const revocationDate = transaction.revocationDate
      ? new Date(Number(transaction.revocationDate))
      : null;

    if (!expiresDate) {
      return {
        ok: true,
        ignored: true,
        reason: "Notification transaction has no expiresDate",
        notificationType,
        subtype,
        transactionId,
      };
    }

    const tier = this.mapAppleProductToTier(productId);
    const now = new Date();

    let status:
      | "active"
      | "grace_period"
      | "billing_retry"
      | "cancelled"
      | "expired"
      | "revoked";

    // 1. HARTE Fälle zuerst
    if (
      !!revocationDate ||
      notificationType === "REFUND" ||
      notificationType === "REVOKE"
    ) {
      status = "revoked";

    // 2. Grace Period
    } else if (
      notificationType === "DID_FAIL_TO_RENEW" &&
      subtype === "GRACE_PERIOD"
    ) {
      status = "grace_period";

    // 3. Billing Retry
    } else if (
      notificationType === "DID_FAIL_TO_RENEW" ||
      notificationType === "GRACE_PERIOD_EXPIRED"
    ) {
      status = "billing_retry";

    // 4. Cancelled (Auto-renew off)
    } else if (
      notificationType === "DID_CHANGE_RENEWAL_STATUS" &&
      Number(renewalInfo?.autoRenewStatus ?? 1) === 0
    ) {
      status = "cancelled";

    // 5. Expired
    } else if (
      notificationType === "EXPIRED" ||
      expiresDate.getTime() <= now.getTime()
    ) {
      status = "expired";

    // 6. Default
    } else {
      status = "active";
    }

    const whereClauses: FindOptionsWhere<UserSubscriptionEntity>[] = [
      {
        provider: "apple",
        providerTransactionId: transactionId,
      },
    ];

    if (originalTransactionId) {
      whereClauses.push({
        provider: "apple",
        providerOriginalTransactionId: originalTransactionId,
      });
    }

    let row = await this.subscriptionRepo.findOne({
        where: whereClauses,
        order: {
          createdAt: "DESC",
        },
    });

    if (!row) {
      return {
        ok: true,
        ignored: true,
        reason: "Subscription row not linked yet",
        notificationType,
        subtype,
        transactionId,
        originalTransactionId,
      };
    }

    row.providerTransactionId = transactionId;
    row.providerOriginalTransactionId = originalTransactionId ?? row.providerOriginalTransactionId;
    row.tier = tier;
    row.startsAt = purchaseDate;
    row.expiresAt = expiresDate;
    row.status = status;
    row.autoRenews = renewalInfo
      ? Number(renewalInfo.autoRenewStatus ?? 0) === 1
      : row.autoRenews;
    row.updatedAt = now;

    await this.subscriptionRepo.save(row);
    await this.syncUserEntitlement(row.userUid);

    console.log("APPLE ENTITLEMENT SYNCED:", {
      userUid: row.userUid,
      status,
    });

    return {
      ok: true,
      notificationType,
      subtype,
      transactionId,
      originalTransactionId,
      status,
    };
  }

  private async syncUserEntitlement(userUid: string) {
    const user = await this.userRepo.findOne({ where: { userUid } });
    if (!user) throw new NotFoundException("User not found");

    const now = new Date();

    const latest = await this.subscriptionRepo.findOne({
      where: {
        userUid,
        provider: "apple",
      },
      order: {
        expiresAt: "DESC",
      },
    });

    if (!latest) {
      user.subscriptionTier = "free";
      user.subscriptionExpiresAt = null;
      user.subscriptionProvider = "none";
      await this.userRepo.save(user);
      return;
    }

    const isActive =
      (latest.status === "active" ||
      latest.status === "grace_period" ||
      latest.status === "cancelled") &&
      latest.expiresAt.getTime() > now.getTime();

    if (isActive) {
      user.subscriptionTier = "premium";
      user.subscriptionExpiresAt = latest.expiresAt;
      user.subscriptionProvider = "apple";
    } else {
      user.subscriptionTier = "free";
      user.subscriptionExpiresAt = null;
      user.subscriptionProvider = "none";
    }

    await this.userRepo.save(user);
  }

  private loadAppleRootCertificates(): Buffer[] {
    const raw = this.cfg.get<string>("APPLE_ROOT_CA_PATHS");
    if (!raw) {
      throw new Error("Missing APPLE_ROOT_CA_PATHS");
    }

    return raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => readFileSync(resolve(p)));
  }

  private mapAppleProductToTier(productId: string): "free" | "premium" {
    switch (productId) {
      case "io.cardline.plus.monthly":
      case "io.cardline.premium.monthly":
        return "premium";
      default:
        throw new BadRequestException(`Unknown Apple productId: ${productId}`);
    }
  }

  isPremiumActive(user: AppUserEntity): boolean {
    return user.subscriptionTier === "premium"
      && !!user.subscriptionExpiresAt
      && user.subscriptionExpiresAt.getTime() > Date.now();
  }

  getSubscriptionStatus(user: AppUserEntity) {
    const isPremium = this.isPremiumActive(user);

    return {
      tier: user.subscriptionTier,
      provider: user.subscriptionProvider,
      expiresAt: user.subscriptionExpiresAt,
      isPremium,
    };
  }
}
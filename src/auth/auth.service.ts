import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsernameBlocklistService } from "./username-blocklist.service";
import { Cron, CronExpression } from "@nestjs/schedule";

import { UserService } from "../user/user.service";
import { AccountDeletionService } from "../user/account-deletion.service";
import { AppUserEntity } from "../user/user.entity";
import { EmailVerificationTokenEntity } from "./email-verification-token.entity";
import { AuthSessionEntity } from "./auth-session.entity";
import { EmailChangeRevokeTokenEntity } from "./email-change-revoke-token.entity";
import { randomToken, sha256Hex } from "./auth.util";
import { RegisterDto, UpdateLanguagePreferencesDto, UpdateEmailAfterRecoveryDto, UpdateUsernameDto } from "./auth.dto";
import { MailService } from "../mail/mail.service";
import {
  buildPlainNoticeEmail,
  buildVerificationCodeEmail,
} from "../mail/mail-templates";

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: {
    userUid: string;
    email: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    emailVerifiedAt: Date | null;
    username: string | null;
    usernameChangedAt: Date | null;
    preferredAppLang: string | null;
    effectiveAppLang: string | null;
    preferredCardLang: string;
    pendingNewEmail: string | null;
    pendingNewEmailVerifiedAt: Date | null;
    emailChangeFinalizesAt: Date | null;
    emailChangeRevokedAt: Date | null;
    subscriptionTier: "free" | "premium";
    subscriptionExpiresAt: Date | null;
    subscriptionProvider: "none" | "apple" | "nowpayments" | "triplea" | "manual";
    appAccountToken: string;
  };
};

type GoogleLoginUser = {
  googleSub: string
  email?: string
  firstName?: string
  lastName?: string
}

@Injectable()
export class AuthService {

  constructor(
    private readonly users: UserService,
    private readonly accountDeletion: AccountDeletionService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly mail: MailService,
    private readonly usernameBlocklistService: UsernameBlocklistService,
    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly evtRepo: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessRepo: Repository<AuthSessionEntity>,
    @InjectRepository(EmailChangeRevokeTokenEntity)
    private readonly emailChangeRevokeTokenRepo: Repository<EmailChangeRevokeTokenEntity>,
  ) {}

  private linkBaseUrl(): string {
    return this.cfg.get<string>("AUTH_LINK_BASE_URL") ?? "http://localhost:3000";
  }

  private magicTtlMin(): number {
    return Number(this.cfg.get<string>("AUTH_MAGICLINK_TTL_MIN") ?? "30");
  }

  private refreshTtlDays(): number {
    return Number(this.cfg.get<string>("AUTH_REFRESH_TTL_DAYS") ?? "30");
  }

  private isValidEmail(emailRaw: string): boolean {
    const email = emailRaw.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private toAuthResponse(user: AppUserEntity, accessToken: string, refreshToken: string): AuthTokens {
    return {
      accessToken,
      refreshToken,
      user: {
        userUid: user.userUid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        birthDate: user.birthDate ?? null,
        emailVerifiedAt: user.emailVerifiedAt,
        username: user.username,
        usernameChangedAt: user.usernameChangedAt,
        preferredAppLang: user.preferredAppLang,
        effectiveAppLang: user.effectiveAppLang,
        preferredCardLang: user.preferredCardLang,
        pendingNewEmail: user.pendingNewEmail,
        pendingNewEmailVerifiedAt: user.pendingNewEmailVerifiedAt,
        emailChangeFinalizesAt: user.emailChangeFinalizesAt,
        emailChangeRevokedAt: user.emailChangeRevokedAt,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
        subscriptionProvider: user.subscriptionProvider,
        appAccountToken: user.appAccountToken,
      },
    };
  }

  private signAccessToken(user: AppUserEntity): string {
    return this.jwt.sign({
      sub: user.userUid,
      email: user.email,
    });
  }

  private assertUserIsActive(user: AppUserEntity) {
    if (this.isUserLocked(user)) {
      throw new UnauthorizedException("User account is locked");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("User account is not active");
    }
  }

  private isUserLocked(user: AppUserEntity): boolean {
    if (!user.lockedAt) return false;
    if (!user.lockedUntil) return true;
    return user.lockedUntil > new Date();
  }

  private assertUserNotLocked(user: AppUserEntity) {
    if (this.isUserLocked(user)) {
      throw new UnauthorizedException("User account is locked");
    }
  }

  private assertUserCanAuthenticate(user: AppUserEntity) {
    this.assertUserNotLocked(user);

    if (user.status === "deleted") {
      throw new UnauthorizedException("User deleted");
    }

    if (user.status === "blocked") {
      throw new UnauthorizedException("User blocked");
    }
  }

  private readonly reservedUsernames = new Set([
    "admin",
    "administrator",
    "support",
    "help",
    "cardline",
    "cardlineapp",
    "official",
    "team",
    "moderator",
    "mod",
    "staff",
    "contact",
    "security",
    "system",
    "api",
    "null",
    "undefined",
    "root",
  ]);

  private normalizeUsername(raw: string): string {
    return raw.trim().toLowerCase();
  }

  private canonicalizeUsername(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[._]/g, "");
  }

  private validateUsername(raw: string): string {
    const username = this.normalizeUsername(raw);
    const canonical = this.canonicalizeUsername(username);

    if (username.length < 3 || username.length > 20) {
      throw new BadRequestException("Username must be between 3 and 20 characters.");
    }

    if (!/^[a-z0-9._]+$/.test(username)) {
      throw new BadRequestException("Username can only contain lowercase letters, numbers, dots and underscores.");
    }

    if (/^[._]|[._]$/.test(username)) {
      throw new BadRequestException("Username cannot start or end with a dot or underscore.");
    }

    if (
      username.includes("..") ||
      username.includes("__") ||
      username.includes("._") ||
      username.includes("_.")
    ) {
      throw new BadRequestException("Username format is invalid.");
    }

    if (
      this.reservedUsernames.has(username) ||
      this.reservedUsernames.has(canonical)
    ) {
      throw new BadRequestException("Username is not available.");
    }

    if (
      this.usernameBlocklistService.isBlockedUsername(username) || 
      this.usernameBlocklistService.isBlockedUsername(canonical)
    ) {
      throw new BadRequestException("Username is not allowed.");
    }

    return username;
  }

  async usernameAvailable(rawUsername: string) {
    const username = this.validateUsername(rawUsername);
    const available = await this.users.isUsernameAvailable(username);

    return {
      ok: true,
      username,
      available,
    };
  }

  private async assertEmailAvailableForUser(emailRaw: string, userUid?: string) {
    const email = emailRaw.trim().toLowerCase();

    const existingUserWithEmail = await this.userRepo.findOne({
      where: { email },
    });

    if (existingUserWithEmail && existingUserWithEmail.userUid !== userUid) {
      throw new BadRequestException("Email already in use.");
    }

    const existingUserWithPendingEmail = await this.userRepo.findOne({
      where: { pendingNewEmail: email },
    });

    if (existingUserWithPendingEmail && existingUserWithPendingEmail.userUid !== userUid) {
      throw new BadRequestException("Email already pending verification.");
    }
  }

  private async issueRefreshSession(userUid: string, meta?: { deviceLabel?: string; userAgent?: string; ip?: string }) {
    const refreshToken = randomToken(48);
    const refreshHash = sha256Hex(refreshToken);

    const now = new Date();
    const expires = new Date(now.getTime() + this.refreshTtlDays() * 24 * 60 * 60 * 1000);

    const s = this.sessRepo.create({
      userUid,
      refreshTokenHash: refreshHash,
      deviceLabel: meta?.deviceLabel ?? null,
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
      createdAt: now,
      lastSeenAt: now,
      revokedAt: null,
      expiresAt: expires,
    });

    await this.sessRepo.save(s);
    return refreshToken;
  }

  async register(dto: RegisterDto, meta?: { deviceLabel?: string; userAgent?: string; ip?: string }) {
    const email = dto.email.trim().toLowerCase();
    const preferredCardLang = this.resolvePreferredCardLang(dto.preferredCardLang);
  
    let user = await this.users.findByEmail(email);

    if (!user) {
      await this.assertEmailAvailableForUser(email);
       
      user = await this.users.createUser({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        status: "pending",
        emailVerifiedAt: null,
        preferredAppLang: dto.preferredAppLang ?? null,
        preferredCardLang,
        createdAt: new Date(),
        appAccountToken: randomUUID(),
      });
    } else {
      this.assertUserCanAuthenticate(user);
    }

    await this.sendEmailVerificationCode(user, user.email);

    return { ok: true };
  }

  async completeProfile(userUid: string, dto: { birthDate: string; username: string }) {
    const user = await this.userRepo.findOneByOrFail({ userUid });

    const username = this.validateUsername(dto.username);

    const available = await this.users.isUsernameAvailable(username, userUid);
    if (!available) {
      throw new BadRequestException("Username is already taken.");
    }

    user.birthDate = dto.birthDate;
    user.username = username;

    if (!user.usernameChangedAt) {
      user.usernameChangedAt = new Date();
    }

    await this.userRepo.save(user);

    return {
      ok: true,
      user: {
        userUid: user.userUid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        birthDate: user.birthDate,
        emailVerifiedAt: user.emailVerifiedAt,
        username: user.username,
        usernameChangedAt: user.usernameChangedAt,
        preferredAppLang: user.preferredAppLang,
        effectiveAppLang: user.effectiveAppLang,
        preferredCardLang: user.preferredCardLang,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionProvider: user.subscriptionProvider,
        appAccountToken: user.appAccountToken,
      },
    };
  }

  private otp6(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  }

  async sendEmailVerificationCode(user: AppUserEntity, targetEmail: string) {
    await this.evtRepo.query(
      `
      UPDATE email_verification_token
      SET used_at = NOW()
      WHERE user_uid = $1
        AND used_at IS NULL
      `,
      [user.userUid],
    );

    const code = this.otp6();
    const hash = sha256Hex(code);

    const now = new Date();
    const expires = new Date(now.getTime() + this.magicTtlMin() * 60 * 1000);

    const tokenRow = this.evtRepo.create({
      userUid: user.userUid,
      tokenHash: hash,
      createdAt: now,
      expiresAt: expires,
      usedAt: null,
    });

    await this.evtRepo.save(tokenRow);

    const ttl = this.magicTtlMin();
    const content = buildVerificationCodeEmail({
      code,
      ttlMinutes: ttl,
      headline: "Your Cardline sign-in code",
      intro: "Use this code to sign in to Cardline.",
    });

    await this.mail.send({
      to: targetEmail,
      subject: "Your Cardline sign-in code",
      text: content.text,
      html: content.html,
    });
  }

  /**
   * Verify email token (one-time), marks user verified, returns tokens.*/
  async verifyEmail(rawTokenOrCode: string, meta?: { deviceLabel?: string; userAgent?: string; ip?: string }) {
    const token = (rawTokenOrCode ?? "").trim().replace(/\s+/g, "");
    if (!token) throw new BadRequestException("Missing token");

    const hash = sha256Hex(token);
    const now = new Date();

    const rows = await this.evtRepo.query(
      `
      SELECT user_uid
      FROM email_verification_token
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > $2
      `,
      [hash, now],
    );

    const userUid = rows?.[0]?.user_uid;
    if (!userUid) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const user = await this.users.findById(userUid);
    if (!user) throw new UnauthorizedException("User not found");

    this.assertUserCanAuthenticate(user);

    await this.evtRepo.query(
      `
      UPDATE email_verification_token
      SET used_at = $2
      WHERE token_hash = $1
      `,
      [hash, now],
    );

    if (user.pendingNewEmail) {
      const nowPlus36h = new Date(Date.now() + 36 * 60 * 60 * 1000);

      user.pendingNewEmailVerifiedAt = new Date();
      user.emailChangeFinalizesAt = nowPlus36h;
      user.emailChangeRevokedAt = null;

      await this.userRepo.save(user);

      await this.sendPendingEmailChangeWarningToCurrentEmail(user);
      await this.sendPendingEmailChangeInfoToNewEmail(user);
    } else if (!user.emailVerifiedAt) {
      await this.users.markEmailVerified(user.userUid);
    }

    const fresh = await this.users.findById(user.userUid);
    if (!fresh) throw new UnauthorizedException("User not found");

    const accessToken = this.signAccessToken(fresh);
    const refreshToken = await this.issueRefreshSession(fresh.userUid, meta);

    return this.toAuthResponse(fresh, accessToken, refreshToken);
  }

  async verifyPendingEmailChange(
    userUid: string,
    rawToken: string,
    options?: { finalizeImmediately?: boolean },
  ) {
    const token = (rawToken ?? "").trim().replace(/\s+/g, "");
    if (!token) {
      throw new BadRequestException("Missing token");
    }

    const hash = sha256Hex(token);
    const now = new Date();

    const rows = await this.evtRepo.query(
      `
      SELECT user_uid
      FROM email_verification_token
      WHERE user_uid = $1
        AND token_hash = $2
        AND used_at IS NULL
        AND expires_at > $3
      `,
      [userUid, hash, now],
    );

    const matchedUserUid = rows?.[0]?.user_uid;
    if (!matchedUserUid) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const user = await this.userRepo.findOneByOrFail({ userUid });

    if (!user.pendingNewEmail) {
      throw new BadRequestException("No pending email change.");
    }

    await this.evtRepo.query(
      `
      UPDATE email_verification_token
      SET used_at = $2
      WHERE user_uid = $1
        AND used_at IS NULL
      `,
      [userUid, now],
    );

    user.pendingNewEmailVerifiedAt = now;
    user.emailChangeRevokedAt = null;

    if (options?.finalizeImmediately) {
      user.emailChangeFinalizesAt = now;
      await this.userRepo.save(user);

      const outcome = await this.applyPendingEmailChangeForUser(user, {
        throwOnConflict: true,
      });

      if (outcome !== "applied") {
        throw new BadRequestException("Email change could not be completed.");
      }

      return { ok: true, finalized: true };
    }

    const nowPlus36h = new Date(Date.now() + 36 * 60 * 60 * 1000);
    user.emailChangeFinalizesAt = nowPlus36h;
    await this.userRepo.save(user);

    await this.sendPendingEmailChangeWarningToCurrentEmail(user);
    await this.sendPendingEmailChangeInfoToNewEmail(user);

    return { ok: true, finalized: false };
  }

  async sendPendingEmailChangeWarningToCurrentEmail(user: AppUserEntity) {
    if (!user.pendingNewEmail || !user.emailChangeFinalizesAt) {
      throw new BadRequestException("Pending email change is not ready.");
    }

    const revokeToken = await this.createEmailChangeRevokeToken(user);
    const revokeLink = `${this.linkBaseUrl()}/auth/revoke-email-change?token=${encodeURIComponent(revokeToken)}`;

    await this.mail.send({
      to: user.email,
      subject: "Cardline email change requested",
      ...buildPlainNoticeEmail({
        headline: "Email change requested",
        body: [
          `Someone requested to change your Cardline email to ${user.pendingNewEmail}.`,
          "",
          `If this was you, no action is needed. The change finalizes at ${user.emailChangeFinalizesAt.toISOString()}.`,
          "",
          "If this was not you, open Cardline and revoke the pending email change.",
          "",
          `Revoke link: ${revokeLink}`,
        ].join("\n"),
      }),
    });
  }

  async sendPendingEmailChangeInfoToNewEmail(user: AppUserEntity) {
    if (!user.pendingNewEmail || !user.emailChangeFinalizesAt) {
      throw new BadRequestException("Pending email change is not ready.");
    }

    await this.mail.send({
      to: user.pendingNewEmail,
      subject: "Your new Cardline email was verified",
      ...buildPlainNoticeEmail({
        headline: "New email verified",
        body: [
          "Your new Cardline email address has been verified.",
          "",
          `The change will take effect at ${user.emailChangeFinalizesAt.toISOString()}.`,
        ].join("\n"),
      }),
    });
  }

  async resendPendingEmailChangeCode(userUid: string) {
    const user = await this.userRepo.findOneByOrFail({ userUid });

    if (!user.pendingNewEmail) {
      throw new BadRequestException("No pending email change.");
    }

    if (user.pendingNewEmailVerifiedAt || user.emailChangeFinalizesAt) {
      throw new BadRequestException("Pending email change already verified.");
    }

    await this.sendEmailVerificationCode(user, user.pendingNewEmail);

    return { ok: true };
  }

  private async applyPendingEmailChangeForUser(
    user: AppUserEntity,
    options?: { throwOnConflict?: boolean },
  ): Promise<"applied" | "conflict" | "skipped"> {
    const newEmail = user.pendingNewEmail;
    if (
      !newEmail ||
      !user.pendingNewEmailVerifiedAt ||
      !user.emailChangeFinalizesAt ||
      user.emailChangeRevokedAt
    ) {
      return "skipped";
    }

    const now = new Date();
    if (user.emailChangeFinalizesAt.getTime() > now.getTime()) {
      return "skipped";
    }

    const existingUserWithEmail = await this.userRepo.findOne({
      where: { email: newEmail },
    });

    if (existingUserWithEmail && existingUserWithEmail.userUid !== user.userUid) {
      if (options?.throwOnConflict) {
        throw new BadRequestException("This email address is already in use.");
      }

      user.pendingNewEmail = null;
      user.pendingNewEmailVerifiedAt = null;
      user.emailChangeFinalizesAt = null;
      user.emailChangeRevokedAt = new Date();
      await this.userRepo.save(user);
      return "conflict";
    }

    const existingUserWithPendingEmail = await this.userRepo.findOne({
      where: { pendingNewEmail: newEmail },
    });

    if (existingUserWithPendingEmail && existingUserWithPendingEmail.userUid !== user.userUid) {
      if (options?.throwOnConflict) {
        throw new BadRequestException("This email address is already in use.");
      }

      user.pendingNewEmail = null;
      user.pendingNewEmailVerifiedAt = null;
      user.emailChangeFinalizesAt = null;
      user.emailChangeRevokedAt = new Date();
      await this.userRepo.save(user);
      return "conflict";
    }

    const oldEmail = user.email;

    user.email = newEmail;
    user.pendingNewEmail = null;
    user.pendingNewEmailVerifiedAt = null;
    user.emailChangeFinalizesAt = null;
    user.emailChangeRevokedAt = null;
    user.emailVerifiedAt = new Date();

    if (user.googleSub) {
      user.googleSub = null;
    }

    await this.userRepo.save(user);

    await this.sendEmailChangeFinalizedToNewEmail(user);
    await this.sendEmailChangeFinalizedToOldEmail(oldEmail, user.email);

    return "applied";
  }

  async finalizePendingEmailChanges() {
    const now = new Date();

    const users = await this.userRepo
      .createQueryBuilder("u")
      .where("u.pending_new_email IS NOT NULL")
      .andWhere("u.pending_new_email_verified_at IS NOT NULL")
      .andWhere("u.email_change_finalizes_at IS NOT NULL")
      .andWhere("u.email_change_finalizes_at <= :now", { now })
      .andWhere("u.email_change_revoked_at IS NULL")
      .getMany();

    let applied = 0;
    for (const user of users) {
      const outcome = await this.applyPendingEmailChangeForUser(user);
      if (outcome === "applied") {
        applied += 1;
      }
    }

    return {
      ok: true,
      processed: users.length,
      applied,
    };
  }

  async revokePendingEmailChange(userUid: string) {
    const user = await this.userRepo.findOneByOrFail({ userUid });

    if (!user.pendingNewEmail || !user.emailChangeFinalizesAt) {
      throw new BadRequestException("No pending email change to revoke.");
    }

    if (user.emailChangeRevokedAt) {
      throw new BadRequestException("Email change already revoked.");
    }

    const now = new Date();
    if (user.emailChangeFinalizesAt.getTime() <= now.getTime()) {
      throw new BadRequestException("Email change can no longer be revoked.");
    }

    user.pendingNewEmail = null;
    user.pendingNewEmailVerifiedAt = null;
    user.emailChangeFinalizesAt = null;
    user.emailChangeRevokedAt = now;

    await this.userRepo.save(user);

    await this.sendEmailChangeRevokedToCurrentEmail(user);

    return { ok: true };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async finalizePendingEmailChangesCron() {
    await this.finalizePendingEmailChanges();
  }

  async sendEmailChangeFinalizedToNewEmail(user: AppUserEntity) {
    await this.mail.send({
      to: user.email,
      subject: "Your Cardline email change is now active",
      ...buildPlainNoticeEmail({
        headline: "Email change complete",
        body: "Your Cardline email address has been updated successfully.",
      }),
    });
  }

  async sendEmailChangeFinalizedToOldEmail(oldEmail: string, newEmail: string) {
    await this.mail.send({
      to: oldEmail,
      subject: "Your Cardline email was changed",
      ...buildPlainNoticeEmail({
        headline: "Email changed",
        body: `Your Cardline account email was changed to ${newEmail}.`,
      }),
    });
  }

  async sendEmailChangeRevokedToCurrentEmail(user: AppUserEntity) {
    await this.mail.send({
      to: user.email,
      subject: "Your pending Cardline email change was revoked",
      ...buildPlainNoticeEmail({
        headline: "Email change revoked",
        body: "The pending email change on your Cardline account was revoked.",
      }),
    });
  }

  private async createEmailChangeRevokeToken(user: AppUserEntity) {
    await this.emailChangeRevokeTokenRepo.query(
      `
      UPDATE email_change_revoke_token
      SET used_at = NOW()
      WHERE user_uid = $1
        AND used_at IS NULL
      `,
      [user.userUid],
    );

    const rawToken = randomToken(48);
    const tokenHash = sha256Hex(rawToken);

    const now = new Date();
    const expires = new Date(now.getTime() + 36 * 60 * 60 * 1000);

    const row = this.emailChangeRevokeTokenRepo.create({
      userUid: user.userUid,
      tokenHash,
      createdAt: now,
      expiresAt: expires,
      usedAt: null,
    });

    await this.emailChangeRevokeTokenRepo.save(row);

    return rawToken;
  }

  async revokePendingEmailChangeByToken(rawToken: string) {
    const token = (rawToken ?? "").trim();
    if (!token) {
      throw new BadRequestException("Missing token");
    }

    const tokenHash = sha256Hex(token);
    const now = new Date();

    const row = await this.emailChangeRevokeTokenRepo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
      },
    });

    if (!row) {
      throw new UnauthorizedException("Invalid or expired revoke token");
    }

    if (row.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedException("Invalid or expired revoke token");
    }

    const user = await this.userRepo.findOneByOrFail({ userUid: row.userUid });

    if (!user.pendingNewEmail || !user.emailChangeFinalizesAt) {
      throw new BadRequestException("No pending email change to revoke.");
    }

    if (user.emailChangeRevokedAt) {
      throw new BadRequestException("Email change already revoked.");
    }

    if (user.emailChangeFinalizesAt.getTime() <= now.getTime()) {
      throw new BadRequestException("Email change can no longer be revoked.");
    }

    user.pendingNewEmail = null;
    user.pendingNewEmailVerifiedAt = null;
    user.emailChangeFinalizesAt = null;
    user.emailChangeRevokedAt = now;

    await this.userRepo.save(user);

    row.usedAt = now;
    await this.emailChangeRevokeTokenRepo.save(row);

    await this.sendEmailChangeRevokedToCurrentEmail(user);

    return { ok: true };
  }

  async refresh(refreshTokenRaw: string) {
    const rt = refreshTokenRaw.trim();
    if (!rt) throw new UnauthorizedException("Missing refresh token");

    const hash = sha256Hex(rt);

    const s = await this.sessRepo.findOne({ where: { refreshTokenHash: hash } });
    if (!s) throw new UnauthorizedException("Invalid refresh token");
    if (s.revokedAt) throw new UnauthorizedException("Session revoked");
    if (s.expiresAt.getTime() < Date.now()) throw new UnauthorizedException("Session expired");

    s.lastSeenAt = new Date();
    await this.sessRepo.save(s);

    const user = await this.users.findById(s.userUid);
    if (!user) throw new UnauthorizedException("User not found");

    this.assertUserNotLocked(user);

    if (!user.emailVerifiedAt) throw new UnauthorizedException("Email not verified");
    if (user.status !== "active") throw new UnauthorizedException("User not active");

    const accessToken = this.signAccessToken(user);
    return { accessToken };
  }

  async requestLoginLink(emailRaw: string, meta?: { deviceLabel?: string; userAgent?: string; ip?: string },) {
    const email = emailRaw.trim().toLowerCase();

    const user = await this.users.findByEmail(email);

    if (!user) return { ok: true };

    this.assertUserCanAuthenticate(user);

    await this.sendEmailVerificationCode(user, user.email);

    return { ok: true };
  }

  async logout(refreshTokenRaw: string) {
    const rt = refreshTokenRaw.trim();
    if (!rt) return { ok: true };

    const hash = sha256Hex(rt);
    const s = await this.sessRepo.findOne({ where: { refreshTokenHash: hash } });
    if (s && !s.revokedAt) {
      s.revokedAt = new Date();
      await this.sessRepo.save(s);
    }
    return { ok: true };
  }

  async logoutAll(userUid: string) {
    await this.sessRepo
      .createQueryBuilder()
      .update(AuthSessionEntity)
      .set({ revokedAt: new Date() })
      .where("user_uid = :userUid", { userUid })
      .andWhere("revoked_at IS NULL")
      .execute();

    return { ok: true };
  }

  async issueRecoverySession(userUid: string, meta?: { deviceLabel?: string; userAgent?: string; ip?: string }) {
    const user = await this.users.findById(userUid);
    if (!user) throw new UnauthorizedException("User not found");

    this.assertUserCanAuthenticate(user);

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshSession(user.userUid, meta);

    return {
      accessToken,
      refreshToken,
      requiresProfileCompletion: user.birthDate == null || user.username == null,
      user: {
        userUid: user.userUid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerifiedAt: user.emailVerifiedAt,
        preferredAppLang: user.preferredAppLang,
        effectiveAppLang: user.effectiveAppLang,
        preferredCardLang: user.preferredCardLang,
        birthDate: user.birthDate,
        username: user.username,
        usernameChangedAt: user.usernameChangedAt,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionProvider: user.subscriptionProvider,
        appAccountToken: user.appAccountToken,
      },
    };
  }

  async issueRecoveryToken(userUid: string) {
    const user = await this.users.findById(userUid);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    this.assertUserCanAuthenticate(user);

    return this.jwt.sign(
      {
        sub: user.userUid,
        type: "recovery",
      },
      {
        expiresIn: "10m",
      },
    );
  }

  async me(userUid: string) {
    const user = await this.users.findById(userUid);
    if (!user) throw new UnauthorizedException("User not found");

    this.assertUserNotLocked(user);

    return {
      userUid: user.userUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      emailVerifiedAt: user.emailVerifiedAt,
      username: user.username,
      usernameChangedAt: user.usernameChangedAt,
      preferredAppLang: user.preferredAppLang,
      effectiveAppLang: user.effectiveAppLang,
      preferredCardLang: user.preferredCardLang,
      status: user.status,
      createdAt: user.createdAt,
      pendingNewEmail: user.pendingNewEmail,
      pendingNewEmailVerifiedAt: user.pendingNewEmailVerifiedAt,
      emailChangeFinalizesAt: user.emailChangeFinalizesAt,
      emailChangeRevokedAt: user.emailChangeRevokedAt,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionProvider: user.subscriptionProvider,
      appAccountToken: user.appAccountToken,
    };
  }

  private async beginPendingEmailChange(user: AppUserEntity, newEmail: string) {
    if (
      user.pendingNewEmail &&
      user.pendingNewEmailVerifiedAt &&
      user.emailChangeFinalizesAt &&
      !user.emailChangeRevokedAt
    ) {
      throw new BadRequestException("An email change is already in progress.");
    }

    await this.assertEmailAvailableForUser(newEmail, user.userUid);

    user.pendingNewEmail = newEmail;
    user.pendingNewEmailVerifiedAt = null;
    user.emailChangeFinalizesAt = null;
    user.emailChangeRevokedAt = null;

    await this.userRepo.save(user);

    await this.sendEmailVerificationCode(user, user.pendingNewEmail);
  }

  async initiateEmailChange(userUid: string, dto: { newEmail: string }) {
    const user = await this.userRepo.findOneByOrFail({ userUid });
    this.assertUserIsActive(user);

    const newEmail = dto.newEmail.trim().toLowerCase();

    if (!this.isValidEmail(newEmail)) {
      throw new BadRequestException("New email is invalid.");
    }

    if (user.email.toLowerCase() === newEmail) {
      throw new BadRequestException("New email must be different.");
    }

    await this.beginPendingEmailChange(user, newEmail);

    return { ok: true };
  }

  async updateEmailAfterRecovery(userUid: string, dto: UpdateEmailAfterRecoveryDto) {
    const user = await this.userRepo.findOneByOrFail({ userUid });

    const currentEmail = dto.currentEmail.trim().toLowerCase();
    const newEmail = dto.newEmail.trim().toLowerCase();

    if (!this.isValidEmail(currentEmail)) {
      throw new BadRequestException("Current email is invalid.");
    }

    if (!this.isValidEmail(newEmail)) {
      throw new BadRequestException("New email is invalid.");
    }

    if (user.email.toLowerCase() !== currentEmail) {
      throw new BadRequestException("Current email does not match.");
    }

    if (currentEmail === newEmail) {
      throw new BadRequestException("New email must be different.");
    }

    await this.beginPendingEmailChange(user, newEmail);

    return { ok: true };
  }

  async deleteMe(userUid: string) {
    throw new BadRequestException(
      "Account deletion requires email confirmation. Use POST /auth/confirm-account-deletion.",
    );
  }

  async requestAccountDeletion(userUid: string) {
    const user = await this.users.findById(userUid);
    if (!user) throw new NotFoundException("User not found");

    this.assertUserCanAuthenticate(user);

    await this.sendAccountDeletionCode(user, user.email);

    return { ok: true };
  }

  async confirmAccountDeletion(userUid: string, rawTokenOrCode: string) {
    const token = (rawTokenOrCode ?? "").trim().replace(/\s+/g, "");
    if (!token) throw new BadRequestException("Missing token");

    const hash = sha256Hex(token);
    const now = new Date();

    const rows = await this.evtRepo.query(
      `
      SELECT user_uid
      FROM email_verification_token
      WHERE token_hash = $1
        AND user_uid = $2
        AND used_at IS NULL
        AND expires_at > $3
      `,
      [hash, userUid, now],
    );

    if (!rows?.[0]?.user_uid) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    return this.accountDeletion.purgeAccount(userUid);
  }

  private async sendAccountDeletionCode(user: AppUserEntity, targetEmail: string) {
    await this.evtRepo.query(
      `
      UPDATE email_verification_token
      SET used_at = NOW()
      WHERE user_uid = $1
        AND used_at IS NULL
      `,
      [user.userUid],
    );

    const code = this.otp6();
    const hash = sha256Hex(code);

    const now = new Date();
    const expires = new Date(now.getTime() + this.magicTtlMin() * 60 * 1000);

    const tokenRow = this.evtRepo.create({
      userUid: user.userUid,
      tokenHash: hash,
      createdAt: now,
      expiresAt: expires,
      usedAt: null,
    });

    await this.evtRepo.save(tokenRow);

    const content = buildVerificationCodeEmail({
      code,
      ttlMinutes: this.magicTtlMin(),
      headline: "Confirm account deletion",
      intro: "Use this code to confirm deletion of your Cardline account.",
    });

    await this.mail.send({
      to: targetEmail,
      subject: "Confirm deletion of your Cardline account",
      text: content.text,
      html: content.html,
    });
  }

  // Google Login
  async loginWithGoogle(googleUser: GoogleLoginUser, meta: { userAgent?: string; ip?: string; deviceLabel?: string },) {
    const { googleSub, email, firstName, lastName } = googleUser;

    if (!googleSub) {
      throw new UnauthorizedException("Invalid Google account");
    }

    let user = await this.userRepo.findOne({
      where: { googleSub },
    });

    if (!user && email) {
      user = await this.userRepo.findOne({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        user.googleSub = googleSub;

        const googleEmail = email.toLowerCase();
        const currentEmail = user.email.toLowerCase();

        if (currentEmail !== googleEmail) {
          user.email = googleEmail;
          user.pendingNewEmail = null;
          user.pendingNewEmailVerifiedAt = null;
          user.emailChangeFinalizesAt = null;
          user.emailChangeRevokedAt = null;
          user.emailVerifiedAt = new Date();
        }

        await this.userRepo.save(user);
      }
    }

    if (!user) {
      if (!email) {
        throw new UnauthorizedException("Google account has no email");
      }

      user = this.userRepo.create({
        email: email.toLowerCase(),
        firstName: firstName?.trim() || "Google",
        lastName: lastName?.trim() || "User",
        birthDate: null,
        googleSub,
        emailVerifiedAt: new Date(),
        preferredAppLang: null,
        preferredCardLang: "en",
        status: "active",
        createdAt: new Date(),
        appAccountToken: randomUUID(),
      });

      user = await this.userRepo.save(user);
    }

    if (user && email) {
      const googleEmail = email.toLowerCase();
      const currentEmail = user.email.toLowerCase();

      if (currentEmail !== googleEmail) {
        user.email = googleEmail;
        user.pendingNewEmail = null;
        user.pendingNewEmailVerifiedAt = null;
        user.emailChangeFinalizesAt = null;
        user.emailChangeRevokedAt = null;
        user.emailVerifiedAt = new Date();

        await this.userRepo.save(user);
      }
    }

    const fresh = await this.userRepo.findOneByOrFail({ userUid: user.userUid });

    this.assertUserCanAuthenticate(fresh);
    const accessToken = this.signAccessToken(fresh);
    const refreshToken = await this.issueRefreshSession(fresh.userUid, meta);

    return {
      accessToken,
      refreshToken,
      requiresProfileCompletion: fresh.birthDate == null || fresh.username == null,
      user: {
        userUid: fresh.userUid,
        email: fresh.email,
        firstName: fresh.firstName,
        lastName: fresh.lastName,
        emailVerifiedAt: fresh.emailVerifiedAt,
        username: fresh.username,
        usernameChangedAt: fresh.usernameChangedAt,
        preferredAppLang: fresh.preferredAppLang,
        preferredCardLang: fresh.preferredCardLang,
        birthDate: fresh.birthDate,
        subscriptionTier: fresh.subscriptionTier,
        subscriptionExpiresAt: fresh.subscriptionExpiresAt,
        subscriptionProvider: fresh.subscriptionProvider,
        appAccountToken: fresh.appAccountToken,
        pendingNewEmail: fresh.pendingNewEmail,
        pendingNewEmailVerifiedAt: fresh.pendingNewEmailVerifiedAt,
        emailChangeFinalizesAt: fresh.emailChangeFinalizesAt,
        emailChangeRevokedAt: fresh.emailChangeRevokedAt,
      },
    };
  }

  private resolvePreferredCardLang(raw?: string | null): string {
    const allowedCardLangs = new Set(["en", "fr", "ja"]);
    const value = (raw ?? "en").trim().toLowerCase();

    if (!allowedCardLangs.has(value)) {
      throw new BadRequestException("Invalid card language.");
    }

    return value;
  }

  async updateLanguagePreferences(userUid: string, dto: UpdateLanguagePreferencesDto,) {
    const user = await this.userRepo.findOneByOrFail({ userUid });

    const allowedAppLangs = new Set(["en", "fr", "de", "it", "es", "pt", "zh-Hans", "ja"]);
    const allowedCardLangs = new Set(["en", "fr", "ja"]);

    let preferredAppLang: string | null = null;

    if (dto.preferredAppLang != null && dto.preferredAppLang !== "") {
      if (!allowedAppLangs.has(dto.preferredAppLang)) {
        throw new BadRequestException("Invalid app language.");
      }
      preferredAppLang = dto.preferredAppLang;
    }

    let effectiveAppLang: string | null = null;

    if (dto.effectiveAppLang != null && dto.effectiveAppLang !== "") {
      if (!allowedAppLangs.has(dto.effectiveAppLang)) {
        throw new BadRequestException("Invalid effective app language.");
      }
      effectiveAppLang = dto.effectiveAppLang;
    } else if (preferredAppLang == null) {
      throw new BadRequestException(
        "effectiveAppLang is required when preferredAppLang is not set (System).",
      );
    }

    if (!allowedCardLangs.has(dto.preferredCardLang)) {
      throw new BadRequestException("Invalid card language.");
    }

    user.preferredAppLang = preferredAppLang;
    user.effectiveAppLang = effectiveAppLang;
    user.preferredCardLang = dto.preferredCardLang;

    await this.userRepo.save(user);

    return {
      ok: true,
      preferredAppLang: user.preferredAppLang,
      effectiveAppLang: user.effectiveAppLang,
      preferredCardLang: user.preferredCardLang,
    };
  }

  async updateUsername(userUid: string, dto: UpdateUsernameDto) {
    const user = await this.userRepo.findOneByOrFail({ userUid });

    const newUsername = this.normalizeUsername(dto.username);
    this.validateUsername(newUsername);

    if (user.username && user.username === newUsername) {
      throw new BadRequestException("New username must be different.");
    }

    if (user.usernameChangedAt) {
      const nextAllowedAt = new Date(user.usernameChangedAt.getTime() + 180 * 24 * 60 * 60 * 1000);

      if (Date.now() < nextAllowedAt.getTime()) {
        throw new BadRequestException("Username can only be changed every 180 days.");
      }
    }

    const existing = await this.userRepo.findOne({
      where: { username: newUsername },
    });

    if (existing && existing.userUid !== user.userUid) {
      throw new BadRequestException("Username is already taken.");
    }

    user.username = newUsername;
    user.usernameChangedAt = new Date();

    await this.userRepo.save(user);

    return {
      ok: true,
      user: {
        userUid: user.userUid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        birthDate: user.birthDate,
        emailVerifiedAt: user.emailVerifiedAt,
        preferredAppLang: user.preferredAppLang,
        effectiveAppLang: user.effectiveAppLang,
        preferredCardLang: user.preferredCardLang,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionProvider: user.subscriptionProvider,
        appAccountToken: user.appAccountToken,
        username: user.username,
        usernameChangedAt: user.usernameChangedAt,
        pendingNewEmail: user.pendingNewEmail,
        pendingNewEmailVerifiedAt: user.pendingNewEmailVerifiedAt,
        emailChangeFinalizesAt: user.emailChangeFinalizesAt,
        emailChangeRevokedAt: user.emailChangeRevokedAt,
      },
    };
  }
}
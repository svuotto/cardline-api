import { BadRequestException, Injectable, NotFoundException, UnauthorizedException,} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, MoreThan } from "typeorm";
import { createHash, timingSafeEqual } from "crypto";

import { UserDeviceBindingEntity } from "./user-device-binding.entity";
import { AppUserEntity } from "../user/user.entity";
import { EnsureDeviceBindingDto, RecoverWithDeviceDto } from "./device-binding.dto";
import { AuthService } from "../auth/auth.service";
import { AuthRecoveryAttemptEntity } from "../auth/auth-recovery-attempt.entity";

@Injectable()
export class DeviceBindingService {
  constructor(
    @InjectRepository(UserDeviceBindingEntity)
    private readonly bindingRepo: Repository<UserDeviceBindingEntity>,

    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,

    private readonly authService: AuthService,

    @InjectRepository(AuthRecoveryAttemptEntity)
    private readonly recoveryAttemptRepo: Repository<AuthRecoveryAttemptEntity>,
  ) {}

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret, "utf8").digest("hex");
  }

  private secureEqualHex(a: string, b: string): boolean {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  }

  private async logRecoveryAttempt(params: {
    username: string;
    userUid?: string | null;
    deviceId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    success: boolean;
    failureReason?: string | null;
  }) {
    const row = this.recoveryAttemptRepo.create({
      username: params.username,
      userUid: params.userUid ?? null,
      deviceId: params.deviceId ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      success: params.success,
      failureReason: params.failureReason ?? null,
      createdAt: new Date(),
    });

    await this.recoveryAttemptRepo.save(row);
  }

  async ensureForUser(userUid: string, dto: EnsureDeviceBindingDto) {
    const user = await this.userRepo.findOne({ where: { userUid } });
    if (!user) throw new NotFoundException("User not found");

    const now = new Date();
    const secretHash = this.hashSecret(dto.secret);

    let row = await this.bindingRepo.findOne({
      where: {
        userUid,
        deviceId: dto.deviceId,
        revokedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
    });

    if (!row) {
      row = this.bindingRepo.create({
        userUid,
        deviceId: dto.deviceId,
        secretHash,
        deviceLabel: dto.deviceLabel ?? null,
        platform: dto.platform ?? "ios",
        biometricProtected: dto.biometricProtected ?? true,
        createdAt: now,
        lastSeenAt: now,
        revokedAt: null,
      });
    } else {
      row.secretHash = secretHash;
      row.deviceLabel = dto.deviceLabel ?? row.deviceLabel;
      row.platform = dto.platform ?? row.platform;
      row.biometricProtected = dto.biometricProtected ?? row.biometricProtected;
      row.lastSeenAt = now;
    }

    await this.bindingRepo.save(row);

    return {
      ok: true,
      binding: {
        userDeviceBindingUid: row.userDeviceBindingUid,
        deviceId: row.deviceId,
        lastSeenAt: row.lastSeenAt,
      },
    };
  }

  private async assertRecoveryRateLimit(params: { username: string; ip?: string | null; deviceId?: string | null; }) {
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const usernameAttempts = await this.recoveryAttemptRepo.count({
      where: {
        username: params.username,
        createdAt: MoreThan(since),
      },
    });

    if (usernameAttempts >= 5) {
      throw new UnauthorizedException("Too many recovery attempts. Please try again later.");
    }

    if (params.ip) {
      const ipAttempts = await this.recoveryAttemptRepo.count({
        where: {
          ip: params.ip,
          createdAt: MoreThan(since),
        },
      });

      if (ipAttempts >= 15) {
        throw new UnauthorizedException("Too many recovery attempts. Please try again later.");
      }
    }
  }

  async recoverWithDevice(dto: RecoverWithDeviceDto, meta?: { deviceLabel?: string; userAgent?: string; ip?: string },) {
    const username = dto.username.trim().toLowerCase();

    const user = await this.userRepo.findOne({
      where: { username },
    });

    if (!user) {
      await this.assertRecoveryRateLimit({
        username,
        ip: meta?.ip ?? null,
        deviceId: dto.deviceId,
      });

      await this.logRecoveryAttempt({
        username,
        userUid: null,
        deviceId: dto.deviceId,
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        success: false,
        failureReason: "user_not_found",
      });

      throw new UnauthorizedException("Recovery failed");
    }

    if (
      user.pendingNewEmail &&
      user.pendingNewEmailVerifiedAt &&
      user.emailChangeFinalizesAt &&
      !user.emailChangeRevokedAt
    ) {
      await this.logRecoveryAttempt({
        username,
        userUid: user.userUid,
        deviceId: dto.deviceId,
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        success: false,
        failureReason: "email_change_already_in_progress",
      });

      throw new BadRequestException("An email change is already in progress.");
    }

    await this.assertRecoveryRateLimit({
      username,
      ip: meta?.ip ?? null,
      deviceId: dto.deviceId,
    });

    const row = await this.bindingRepo.findOne({
      where: {
        userUid: user.userUid,
        deviceId: dto.deviceId,
        revokedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
    });

    if (!row) {
      await this.logRecoveryAttempt({
        username,
        userUid: user.userUid,
        deviceId: dto.deviceId,
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        success: false,
        failureReason: "binding_not_found",
      });

      throw new UnauthorizedException("Recovery failed");
    }

    const incomingHash = this.hashSecret(dto.secret);
    if (!this.secureEqualHex(row.secretHash, incomingHash)) {
      await this.logRecoveryAttempt({
        username,
        userUid: user.userUid,
        deviceId: dto.deviceId,
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        success: false,
        failureReason: "secret_mismatch",
      });

      throw new UnauthorizedException("Recovery failed");
    }

    row.lastSeenAt = new Date();
    await this.bindingRepo.save(row);

    await this.logRecoveryAttempt({
      username,
      userUid: user.userUid,
      deviceId: dto.deviceId,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
      success: true,
      failureReason: null,
    });

    const recoveryToken = await this.authService.issueRecoveryToken(user.userUid);

    return {
      ok: true,
      recoveryAllowed: true,
      recoveryToken,
    };
  }

  async revokeBinding(userUid: string, deviceId: string) {
    const row = await this.bindingRepo.findOne({
      where: { userUid, deviceId, revokedAt: IsNull() },
    });

    if (!row) throw new NotFoundException("Binding not found");

    row.revokedAt = new Date();
    await this.bindingRepo.save(row);

    return { ok: true };
  }

  async revokeBindingByUid(userUid: string, userDeviceBindingUid: string) {
    const row = await this.bindingRepo.findOne({
      where: {
        userUid,
        userDeviceBindingUid,
        revokedAt: IsNull(),
      },
    });

    if (!row) {
      throw new NotFoundException("Binding not found");
    }

    row.revokedAt = new Date();
    await this.bindingRepo.save(row);

    return { ok: true };
  }

  async listBindingsForUser(userUid: string) {
    const rows = await this.bindingRepo.find({
      where: {
        userUid,
        revokedAt: IsNull(),
      },
      order: {
        lastSeenAt: "DESC",
      },
    });

    return {
      ok: true,
      devices: rows.map((row) => ({
        userDeviceBindingUid: row.userDeviceBindingUid,
        deviceId: row.deviceId,
        deviceLabel: row.deviceLabel,
        platform: row.platform,
        biometricProtected: row.biometricProtected,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
      })),
    };
  }
}
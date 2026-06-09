import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { AppUserEntity } from "../user/user.entity";

@Entity({ name: "auth_session" })
export class AuthSessionEntity {
  @PrimaryGeneratedColumn("uuid", { name: "session_uid" })
  sessionUid!: string;

  @Column({ type: "uuid", name: "user_uid" })
  @Index("ix_auth_session_user")
  userUid!: string;

  @ManyToOne(() => AppUserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_uid", referencedColumnName: "userUid" })
  user?: AppUserEntity;

  @Column({ type: "text", name: "refresh_token_hash", unique: true })
  @Index("ux_auth_session_refresh_hash", { unique: true })
  refreshTokenHash!: string;

  @Column({ type: "text", name: "device_label", nullable: true })
  deviceLabel!: string | null;

  @Column({ type: "text", name: "user_agent", nullable: true })
  userAgent!: string | null;

  @Column({ type: "text", name: "ip", nullable: true })
  ip!: string | null;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "last_seen_at" })
  lastSeenAt!: Date;

  @Column({ type: "timestamptz", name: "revoked_at", nullable: true })
  revokedAt!: Date | null;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt!: Date;
}


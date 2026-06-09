import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { AppUserEntity } from "../user/user.entity";

@Entity({ name: "email_verification_token" })
export class EmailVerificationTokenEntity {
  @PrimaryGeneratedColumn("uuid", { name: "token_uid" })
  tokenUid!: string;

  @Column({ type: "uuid", name: "user_uid" })
  @Index("ix_evt_user")
  userUid!: string;

  @ManyToOne(() => AppUserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_uid", referencedColumnName: "userUid" })
  user?: AppUserEntity;

  @Column({ type: "text", name: "token_hash", unique: true })
  @Index("ux_evt_token_hash", { unique: true })
  tokenHash!: string;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "used_at", nullable: true })
  usedAt!: Date | null;
}
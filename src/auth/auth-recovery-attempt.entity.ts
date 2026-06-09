import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "auth_recovery_attempt" })
export class AuthRecoveryAttemptEntity {
  @PrimaryGeneratedColumn("uuid", { name: "auth_recovery_attempt_uid" })
  authRecoveryAttemptUid!: string;

  @Column("text", { name: "username" })
  username!: string;

  @Column("uuid", { name: "user_uid", nullable: true })
  userUid!: string | null;

  @Column("text", { name: "device_id", nullable: true })
  deviceId!: string | null;

  @Column("text", { name: "ip", nullable: true })
  ip!: string | null;

  @Column("text", { name: "user_agent", nullable: true })
  userAgent!: string | null;

  @Column("boolean", { name: "success", default: false })
  success!: boolean;

  @Column("text", { name: "failure_reason", nullable: true })
  failureReason!: string | null;

  @Column("timestamptz", { name: "created_at" })
  createdAt!: Date;
}
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_device_binding" })
@Index("ux_user_device_binding_user_device_active", ["userUid", "deviceId"], {
  unique: true,
  where: `"revoked_at" IS NULL`,
})
export class UserDeviceBindingEntity {
  @PrimaryGeneratedColumn("uuid", { name: "user_device_binding_uid" })
  userDeviceBindingUid!: string;

  @Column("uuid", { name: "user_uid" })
  userUid!: string;

  @Column("text", { name: "device_id" })
  deviceId!: string;

  @Column("text", { name: "secret_hash" })
  secretHash!: string;

  @Column("text", { name: "device_label", nullable: true })
  deviceLabel!: string | null;

  @Column("text", { name: "platform", default: "ios" })
  platform!: string;

  @Column("boolean", { name: "biometric_protected", default: true })
  biometricProtected!: boolean;

  @Column("timestamptz", { name: "created_at" })
  createdAt!: Date;

  @Column("timestamptz", { name: "last_seen_at" })
  lastSeenAt!: Date;

  @Column("timestamptz", { name: "revoked_at", nullable: true })
  revokedAt!: Date | null;
}
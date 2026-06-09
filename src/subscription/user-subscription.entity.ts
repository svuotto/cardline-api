import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "user_subscription" })
export class UserSubscriptionEntity {
  @PrimaryGeneratedColumn("uuid", { name: "user_subscription_uid" })
  userSubscriptionUid!: string;

  @Column("uuid", { name: "user_uid" })
  userUid!: string;

  @Column("text", { name: "provider" })
  provider!: "apple" | "nowpayments" | "triplea" | "manual";

  @Column("text", { name: "provider_original_transaction_id", nullable: true })
  providerOriginalTransactionId!: string | null;

  @Column("text", { name: "provider_transaction_id", nullable: true })
  providerTransactionId!: string | null;

  @Column("text", { name: "tier" })
  tier!: "free" | "premium";

  @Column("timestamptz", { name: "starts_at" })
  startsAt!: Date;

  @Column("timestamptz", { name: "expires_at" })
  expiresAt!: Date;

  @Column("boolean", { name: "auto_renews", default: false })
  autoRenews!: boolean;

  @Column("text", { name: "status" })
  status!: "active" | "grace_period" | "billing_retry" | "cancelled" | "expired" | "revoked";

  @Column("timestamptz", { name: "created_at" })
  createdAt!: Date;

  @Column("timestamptz", { name: "updated_at" })
  updatedAt!: Date;

  @Column("uuid", { name: "app_account_token", nullable: true })
  appAccountToken!: string | null;
}
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "app_user" })
export class AppUserEntity {

  //** USER **/
  @PrimaryGeneratedColumn("uuid", { name: "user_uid" })
  userUid!: string;

  @Column("text", { name: "user_first_name" })
  firstName!: string;

  @Column("text", { name: "user_last_name" })
  lastName!: string;

  @Column("date", { name: "user_birth_date", nullable: true })
  birthDate!: string | null;

  @Index({ unique: true })
  @Column("citext", { name: "user_email" })
  email!: string;

  @Index({ unique: true, where: `"username" IS NOT NULL` })
  @Column("text", { name: "username", nullable: true })
  username!: string | null;

  @Column("timestamptz", { name: "username_changed_at", nullable: true })
  usernameChangedAt!: Date | null;

  @Column("text", { name: "user_status" })
  status!: string;

  @Column("timestamptz", { name: "user_email_verified_at", nullable: true })
  emailVerifiedAt!: Date | null;

  @Column("text", { name: "user_preferred_app_lang", nullable: true })
  preferredAppLang!: string | null;

  /** Resolved device/app locale when preferredAppLang is null (System). Used for push copy. */
  @Column("text", { name: "user_effective_app_lang", nullable: true })
  effectiveAppLang!: string | null;

  @Column("text", { name: "user_preferred_card_lang" })
  preferredCardLang!: string;

  @Column("timestamptz", { name: "user_created_at" })
  createdAt!: Date;

  @Column("timestamptz", { name: "user_locked_at", nullable: true })
  lockedAt!: Date | null;

  @Column("timestamptz", { name: "user_locked_until", nullable: true })
  lockedUntil!: Date | null;

  //Recovery
  @Column("citext", { name: "pending_new_email", nullable: true }) 
  pendingNewEmail!: string | null;

  @Column("timestamptz", { name: "pending_new_email_verified_at", nullable: true })
  pendingNewEmailVerifiedAt!: Date | null;

  @Column("timestamptz", { name: "email_change_finalizes_at", nullable: true })
  emailChangeFinalizesAt!: Date | null;

  @Column("timestamptz", { name: "email_change_revoked_at", nullable: true })
  emailChangeRevokedAt!: Date | null;

  //** GOOGLE LOGIN **/
  @Column({ name: "google_sub", type: "text", nullable: true, unique: true })
  googleSub!: string | null;

  //** SUBSCRIPTION **/
  @Column({ name: "subscription_tier", type: "text", default: "free" })
  subscriptionTier!: "free" | "premium";

  @Column("timestamptz", { name: "subscription_expires_at", nullable: true })
  subscriptionExpiresAt!: Date | null;

  @Column({ name: "subscription_provider", type: "text", default: "none" })
  subscriptionProvider!: "none" | "apple" | "nowpayments" | "triplea" | "manual";

  @Column("uuid", { name: "app_account_token", unique: true })
  appAccountToken!: string;
}
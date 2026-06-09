import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "email_change_revoke_token" })
export class EmailChangeRevokeTokenEntity {
  @PrimaryGeneratedColumn("uuid", { name: "email_change_revoke_token_uid" })
  emailChangeRevokeTokenUid!: string;

  @Column("uuid", { name: "user_uid" })
  userUid!: string;

  @Column("text", { name: "token_hash" })
  tokenHash!: string;

  @Column("timestamptz", { name: "created_at" })
  createdAt!: Date;

  @Column("timestamptz", { name: "expires_at" })
  expiresAt!: Date;

  @Column("timestamptz", { name: "used_at", nullable: true })
  usedAt!: Date | null;
}
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, } from "typeorm";

@Entity("user_push_token")
export class PushTokenEntity {
  @PrimaryColumn({
    name: "user_push_token_uid",
    type: "text",
  })
  pushTokenUid!: string;

  @Column({
    name: "user_uid",
    type: "text",
  })
  userUid!: string;

  @Column({
    name: "device_id",
    type: "text",
    nullable: true,
  })
  deviceId!: string | null;

  @Column({
    name: "platform",
    type: "text",
  })
  platform!: "ios";

  @Column({
    name: "push_token",
    type: "text",
  })
  pushToken!: string;

  @Column({
    name: "push_enabled",
    type: "boolean",
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({
    name: "push_token_created_at",
    type: "timestamptz",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "push_token_updated_at",
    type: "timestamptz",
  })
  updatedAt!: Date;

  @Column({
    name: "device_label",
    type: "text",
    nullable: true,
  })
  deviceLabel!: string | null;

  @Column({
    name: "last_seen_at",
    type: "timestamptz",
    nullable: true,
  })
  lastSeenAt!: Date | null;
}
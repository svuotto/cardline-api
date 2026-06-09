import { Column, Entity, PrimaryColumn, } from "typeorm";

@Entity("user_notification")
export class NotificationEntity {
  @PrimaryColumn({ name: "user_notification_uid", type: "text" })
  notificationUid!: string;

  @Column({ name: "user_uid", type: "text" })
  userUid!: string;

  @Column({ name: "notification_type", type: "text" })
  notificationType!: string;

  @Column({ name: "notification_priority", type: "text", default: "normal" })
  notificationPriority!: string;

  @Column({ name: "notification_title", type: "text" })
  title!: string;

  @Column({ name: "notification_body", type: "text" })
  body!: string;

  @Column({ name: "notification_image_url", type: "text", nullable: true })
  imageUrl!: string | null;

  @Column({ name: "notification_deep_link", type: "text", nullable: true })
  deepLink!: string | null;

  @Column({ name: "notification_metadata_json", type: "jsonb", default: {} })
  metadata!: Record<string, any>;

  @Column({ name: "notification_is_read", type: "boolean", default: false })
  isRead!: boolean;

  @Column({ name: "notification_read_at", type: "timestamptz", nullable: true })
  readAt!: Date | null;

  @Column({ name: "notification_delivered_push", type: "boolean", default: false })
  deliveredPush!: boolean;

  @Column({ name: "notification_created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "notification_expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;
}
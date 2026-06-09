import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AppUserEntity } from "../user/user.entity";

export type FeedbackKind = "support" | "bug_report" | "help_request";
export type FeedbackStatus = "open" | "closed";

@Entity({ name: "user_feedback" })
@Index("ix_user_feedback_user_uid_created_at", ["userUid", "createdAt"])
export class UserFeedbackEntity {
  @PrimaryGeneratedColumn("uuid", { name: "feedback_uid" })
  feedbackUid!: string;

  @Column({ type: "uuid", name: "user_uid" })
  userUid!: string;

  @ManyToOne(() => AppUserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_uid", referencedColumnName: "userUid" })
  user?: AppUserEntity;

  @Column({ type: "text", name: "kind" })
  kind!: FeedbackKind;

  @Column({ type: "text", name: "category", nullable: true })
  category!: string | null;

  @Column({ type: "text", name: "title", nullable: true })
  title!: string | null;

  @Column({ type: "text", name: "body" })
  body!: string;

  @Column({ type: "text", name: "device_name", nullable: true })
  deviceName!: string | null;

  @Column({ type: "text", name: "ios_version", nullable: true })
  iosVersion!: string | null;

  @Column({ type: "text", name: "app_version", nullable: true })
  appVersion!: string | null;

  @Column({ type: "text", name: "attachments_json", nullable: true })
  attachmentsJson!: string | null;

  @Column({ type: "text", name: "status", nullable: true })
  status!: FeedbackStatus | null;

  @Column({ type: "timestamptz", name: "closed_at", nullable: true })
  closedAt!: Date | null;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}

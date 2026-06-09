import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "user_notification_preference" })
export class UserNotificationPreferenceEntity {
  @PrimaryColumn({ name: "user_uid", type: "uuid" })
  userUid!: string;

  @Column({
    name: "notify_new_products",
    type: "boolean",
    default: true,
  })
  notifyNewProducts!: boolean;

  @Column({
    name: "notify_tier_decks",
    type: "boolean",
    default: true,
  })
  notifyTierDecks!: boolean;
}

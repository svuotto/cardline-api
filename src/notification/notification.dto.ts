export type NotificationType =
  | "system"
  | "maintenance"
  | "new_cards"
  | "marketplace_sale"
  | "marketplace_purchase"
  | "offer_received"
  | "offer_accepted"
  | "price_alert"
  | "deck_shared"
  | "premium"
  | "security";

export type NotificationPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface NotificationDto {
  notificationUid: string;
  userUid: string;
  notificationType: string;
  notificationPriority: string;
  title: string;
  body: string;
  imageUrl: string | null;
  deepLink: string | null;
  metadata: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  deliveredPush: boolean;
  createdAt: string;
  expiresAt: string | null;
}
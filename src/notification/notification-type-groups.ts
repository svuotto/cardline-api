/** Always delivered (inbox + push). User cannot disable these in the app. */
export const ESSENTIAL_NOTIFICATION_TYPES = new Set([
  "system",
  "maintenance",
  "security",
  "premium",
]);

/** Catalog / product announcements (cards, cases, displays, boosters, …). */
export const NEW_PRODUCT_NOTIFICATION_TYPES = new Set([
  "new_cards",
  "new_displays",
  "new_cases",
  "new_boosters",
  "new_products",
]);

export const TIER_DECK_NOTIFICATION_TYPES = new Set([
  "new_tier_decks",
]);

/** Reserved for future settings sections (not toggleable in the app yet). */
export const FUTURE_GAME_UPDATE_NOTIFICATION_TYPES = new Set([
  "game_update",
  "rules_update",
  "tournament",
]);

export const FUTURE_MARKETPLACE_NOTIFICATION_TYPES = new Set([
  "marketplace_sale",
  "marketplace_purchase",
  "offer_received",
  "offer_accepted",
  "price_alert",
  "deck_shared",
]);

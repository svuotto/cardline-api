export const NOTIFICATION_COPY_LOCALES = [
  "en",
  "fr",
  "de",
  "it",
  "es",
  "pt",
  "zh",
  "ja",
] as const;

export type NotificationCopyLocale = (typeof NOTIFICATION_COPY_LOCALES)[number];

export type NotificationCopy = { title: string; body: string };

const DEFAULT_NOTIFICATION_LOCALE: NotificationCopyLocale = "en";

const NOTIFICATION_LANG_ALIASES: Record<string, NotificationCopyLocale> = {
  "zh-Hans": "zh",
  "zh-Hant": "zh",
};

function normalizeNotificationLang(raw: string): string {
  const trimmed = raw.trim();
  return NOTIFICATION_LANG_ALIASES[trimmed] ?? trimmed;
}

export function resolveNotificationLocale(
  preferredAppLang: string | null | undefined,
  effectiveAppLang?: string | null | undefined,
): NotificationCopyLocale {
  const raw = (preferredAppLang?.trim() || effectiveAppLang?.trim() || "").trim();

  if (!raw) {
    return DEFAULT_NOTIFICATION_LOCALE;
  }

  const lang = normalizeNotificationLang(raw);

  if ((NOTIFICATION_COPY_LOCALES as readonly string[]).includes(lang)) {
    return lang as NotificationCopyLocale;
  }

  return DEFAULT_NOTIFICATION_LOCALE;
}

export const NOTIFICATION_COPY_KEYS = [
  "system",
  "maintenance",
  "security",
  "premium",
  "new_cards",
  "new_products",
  "new_tier_decks",
] as const;

export type NotificationCopyKey = (typeof NOTIFICATION_COPY_KEYS)[number];

type LocalizedTemplates = Record<NotificationCopyLocale, NotificationCopy>;

const NOTIFICATION_COPY: Record<NotificationCopyKey, LocalizedTemplates> = {
  system: {
    en: { title: "Cardline", body: "You have a new notification." },
    fr: { title: "Cardline", body: "Vous avez une nouvelle notification." },
    de: { title: "Cardline", body: "Du hast eine neue Benachrichtigung." },
    it: { title: "Cardline", body: "Hai una nuova notifica." },
    es: { title: "Cardline", body: "Tienes una nueva notificación." },
    pt: { title: "Cardline", body: "Você tem uma nova notificação." },
    zh: { title: "Cardline", body: "你有一条新通知。" },
    ja: { title: "Cardline", body: "新しい通知があります。" },
  },
  maintenance: {
    en: {
      title: "Scheduled maintenance",
      body: "Cardline will be briefly unavailable for maintenance.",
    },
    fr: {
      title: "Maintenance planifiée",
      body: "Cardline sera brièvement indisponible pour maintenance.",
    },
    de: {
      title: "Geplante Wartung",
      body: "Cardline ist kurzzeitig wegen Wartung nicht verfügbar.",
    },
    it: {
      title: "Manutenzione programmata",
      body: "Cardline sarà brevemente non disponibile per manutenzione.",
    },
    es: {
      title: "Mantenimiento programado",
      body: "Cardline no estará disponible brevemente por mantenimiento.",
    },
    pt: {
      title: "Manutenção programada",
      body: "O Cardline ficará brevemente indisponível para manutenção.",
    },
    zh: {
      title: "计划维护",
      body: "Cardline 将因维护短暂不可用。",
    },
    ja: {
      title: "メンテナンスのお知らせ",
      body: "メンテナンスのため、Cardline は一時的に利用できません。",
    },
  },
  security: {
    en: {
      title: "Security notice",
      body: "There was important activity on your Cardline account.",
    },
    fr: {
      title: "Alerte sécurité",
      body: "Une activité importante a eu lieu sur votre compte Cardline.",
    },
    de: {
      title: "Sicherheitshinweis",
      body: "Es gab wichtige Aktivität auf deinem Cardline-Konto.",
    },
    it: {
      title: "Avviso di sicurezza",
      body: "È stata registrata un'attività importante sul tuo account Cardline.",
    },
    es: {
      title: "Aviso de seguridad",
      body: "Hubo actividad importante en tu cuenta de Cardline.",
    },
    pt: {
      title: "Aviso de segurança",
      body: "Houve atividade importante na sua conta Cardline.",
    },
    zh: {
      title: "安全提醒",
      body: "你的 Cardline 账户有重要活动。",
    },
    ja: {
      title: "セキュリティのお知らせ",
      body: "Cardline アカウントで重要な操作がありました。",
    },
  },
  premium: {
    en: {
      title: "Premium update",
      body: "Your Cardline Premium subscription has been updated.",
    },
    fr: {
      title: "Mise à jour Premium",
      body: "Votre abonnement Cardline Premium a été mis à jour.",
    },
    de: {
      title: "Premium-Update",
      body: "Dein Cardline-Premium-Abo wurde aktualisiert.",
    },
    it: {
      title: "Aggiornamento Premium",
      body: "Il tuo abbonamento Cardline Premium è stato aggiornato.",
    },
    es: {
      title: "Actualización Premium",
      body: "Tu suscripción Cardline Premium ha sido actualizada.",
    },
    pt: {
      title: "Atualização Premium",
      body: "Sua assinatura Cardline Premium foi atualizada.",
    },
    zh: {
      title: "Premium 更新",
      body: "你的 Cardline Premium 订阅已更新。",
    },
    ja: {
      title: "Premium の更新",
      body: "Cardline Premium のサブスクリプションが更新されました。",
    },
  },
  new_cards: {
    en: {
      title: "New cards available",
      body: "{{productName}} is now in the catalog.",
    },
    fr: {
      title: "Nouvelles cartes disponibles",
      body: "{{productName}} est maintenant dans le catalogue.",
    },
    de: {
      title: "Neue Karten verfügbar",
      body: "{{productName}} ist jetzt im Katalog.",
    },
    it: {
      title: "Nuove carte disponibili",
      body: "{{productName}} è ora nel catalogo.",
    },
    es: {
      title: "Nuevas cartas disponibles",
      body: "{{productName}} ya está en el catálogo.",
    },
    pt: {
      title: "Novas cartas disponíveis",
      body: "{{productName}} já está no catálogo.",
    },
    zh: {
      title: "新卡牌上架",
      body: "{{productName}} 已加入目录。",
    },
    ja: {
      title: "新しいカードが追加されました",
      body: "{{productName}} がカタログに追加されました。",
    },
  },
  new_products: {
    en: {
      title: "New products",
      body: "{{productName}} has been added to Cardline.",
    },
    fr: {
      title: "Nouveaux produits",
      body: "{{productName}} a été ajouté à Cardline.",
    },
    de: {
      title: "Neue Produkte",
      body: "{{productName}} wurde zu Cardline hinzugefügt.",
    },
    it: {
      title: "Nuovi prodotti",
      body: "{{productName}} è stato aggiunto a Cardline.",
    },
    es: {
      title: "Nuevos productos",
      body: "{{productName}} se ha añadido a Cardline.",
    },
    pt: {
      title: "Novos produtos",
      body: "{{productName}} foi adicionado ao Cardline.",
    },
    zh: {
      title: "新产品",
      body: "{{productName}} 已添加到 Cardline。",
    },
    ja: {
      title: "新しい商品",
      body: "{{productName}} が Cardline に追加されました。",
    },
  },
  new_tier_decks: {
    en: {
      title: "New tier deck",
      body: "{{deckName}} is now available.",
    },
    fr: {
      title: "Nouveau deck de tier",
      body: "{{deckName}} est maintenant disponible.",
    },
    de: {
      title: "Neues Tier-Deck",
      body: "{{deckName}} ist jetzt verfügbar.",
    },
    it: {
      title: "Nuovo deck tier",
      body: "{{deckName}} è ora disponibile.",
    },
    es: {
      title: "Nuevo mazo tier",
      body: "{{deckName}} ya está disponible.",
    },
    pt: {
      title: "Novo deck tier",
      body: "{{deckName}} já está disponível.",
    },
    zh: {
      title: "新段位卡组",
      body: "{{deckName}} 现已可用。",
    },
    ja: {
      title: "新しいティアデッキ",
      body: "{{deckName}} が利用可能になりました。",
    },
  },
};

function interpolateCopy(
  template: string,
  templateArgs: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return templateArgs[key] ?? "";
  });
}

export function getNotificationCopy(
  copyKey: NotificationCopyKey,
  locale: NotificationCopyLocale,
  templateArgs: Record<string, string> = {},
): NotificationCopy {
  const templates = NOTIFICATION_COPY[copyKey];
  const localized =
    templates[locale] ?? templates[DEFAULT_NOTIFICATION_LOCALE];

  return {
    title: interpolateCopy(localized.title, templateArgs),
    body: interpolateCopy(localized.body, templateArgs),
  };
}

// --- DEV TEST ONLY (nur für Testzwecke, später löschen) ---

const DEV_TEST_SYSTEM_COPY: Record<NotificationCopyLocale, NotificationCopy> = {
  en: {
    title: "Cardline Test Notification",
    body: "This is a test push notification.",
  },
  fr: {
    title: "Notification test Cardline",
    body: "Ceci est une notification push de test.",
  },
  de: {
    title: "Cardline Testbenachrichtigung",
    body: "Dies ist eine Test-Push-Benachrichtigung.",
  },
  it: {
    title: "Notifica di prova Cardline",
    body: "Questa è una notifica push di prova.",
  },
  es: {
    title: "Notificación de prueba Cardline",
    body: "Esta es una notificación push de prueba.",
  },
  pt: {
    title: "Notificação de teste Cardline",
    body: "Esta é uma notificação push de teste.",
  },
  zh: {
    title: "Cardline 测试通知",
    body: "这是一条测试推送通知。",
  },
  ja: {
    title: "Cardline テスト通知",
    body: "これはテスト用のプッシュ通知です。",
  },
};

export function getDevTestSystemCopy(
  locale: NotificationCopyLocale,
): NotificationCopy {
  return DEV_TEST_SYSTEM_COPY[locale];
}

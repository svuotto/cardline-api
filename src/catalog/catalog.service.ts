import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type Lang = 'en' | 'fr' | 'ja';

type CatalogDomain =
  | 'cards'
  | 'products'
  | 'lookups'
  | 'displays'
  | 'cases'
  | 'boosters'
  | 'decks'
  | 'doublePacks'
  | 'deckRestrictions';

type DomainVersions = Record<CatalogDomain, number>;

type FileOut = {
  contentType: string;
  body: Buffer;
};

@Injectable()
export class CatalogService {
  private cache: Map<string, any> = new Map(); // name -> JSON object
  private manifestCache: any | null = null;

  // only the 3 langs for now
  private langs: Lang[] = ['en', 'fr', 'ja'];

  constructor(private readonly ds: DataSource) {}

  // ---------- Public API ----------

  async getManifest() {
    if (!this.manifestCache) {
      await this.buildAll();
    }
    return this.manifestCache;
  }

  /**
   * Used by controller: returns bytes + content-type (so controller can res.send(Buffer))
   */
  async getFile(name: string): Promise<FileOut> {
    const obj = await this.getFileByName(name);
    if (!obj) throw new NotFoundException(`catalog file not found: ${name}`);

    const json = JSON.stringify(obj);
    return {
      contentType: 'application/json; charset=utf-8',
      body: Buffer.from(json, 'utf8'),
    };
  }

  /**
   * Optional: returns the JSON object directly
   */
  async getFileByName(name: string) {
    const allowedLangFile =
      /^(cards|products|lookups|displays|cases|boosters|decks|double_packs)_(en|fr|ja)$/.test(
        name,
      );
    const allowedDeckRestrictions = name === 'deck_restrictions';

    if (!allowedLangFile && !allowedDeckRestrictions) {
      return null;
    }

    if (!this.cache.has(name)) {
      await this.buildAll();
    }
    return this.cache.get(name) ?? null;
  }

  // ---------- Build & Cache ----------

  private async buildAll() {
    const version = await this.computeCatalogVersion();
    const files: any[] = [];

    for (const lang of this.langs) {
      const cardsName = `cards_${lang}`;
      const productsName = `products_${lang}`;
      const lookupsName = `lookups_${lang}`;
      const displaysName = `displays_${lang}`;
      const casesName = `cases_${lang}`;
      const boostersName = `boosters_${lang}`;
      const decksName = `decks_${lang}`;
      const doublePacksName = `double_packs_${lang}`;

      const cards = await this.buildCards(lang, version);
      const products = await this.buildProducts(lang, version);
      const lookups = await this.buildLookups(lang, version);
      const displays = await this.buildDisplays(lang, version);
      const cases = await this.buildCases(lang, version);
      const boosters = await this.buildBoosters(lang, version);
      const decks = await this.buildDecks(lang, version);
      const doublePacks = await this.buildDoublePacks(lang, version);

      this.cache.set(cardsName, cards);
      this.cache.set(productsName, products);
      this.cache.set(lookupsName, lookups);
      this.cache.set(displaysName, displays);
      this.cache.set(casesName, cases);
      this.cache.set(boostersName, boosters);
      this.cache.set(decksName, decks);
      this.cache.set(doublePacksName, doublePacks);

      files.push(this.manifestEntry(cardsName, cards));
      files.push(this.manifestEntry(productsName, products));
      files.push(this.manifestEntry(lookupsName, lookups));
      files.push(this.manifestEntry(displaysName, displays));
      files.push(this.manifestEntry(casesName, cases));
      files.push(this.manifestEntry(boostersName, boosters));
      files.push(this.manifestEntry(decksName, decks));
      files.push(this.manifestEntry(doublePacksName, doublePacks));
    }

    const deckRestrictionsName = 'deck_restrictions';
    const deckRestrictions = this.buildDeckRestrictions();
    this.cache.set(deckRestrictionsName, deckRestrictions);
    files.push(this.manifestEntry(deckRestrictionsName, deckRestrictions));

    const deckRestrictionsVersion =
      this.resolveDeckRestrictionsVersion(deckRestrictions);

    const domains = this.computeDomainVersions(files, deckRestrictionsVersion);

    this.manifestCache = {
      catalogVersion: Math.max(...Object.values(domains)),
      generatedAt: new Date().toISOString(),
      cardLanguages: this.langs,
      domains,
      files,
    };
  }

  private domainFromFileName(name: string): CatalogDomain {
    if (name === 'deck_restrictions') {
      return 'deckRestrictions';
    }

    if (name.startsWith('double_packs_')) {
      return 'doublePacks';
    }

    const prefix = name.split('_')[0];
    if (
      prefix === 'cards' ||
      prefix === 'products' ||
      prefix === 'lookups' ||
      prefix === 'displays' ||
      prefix === 'cases' ||
      prefix === 'boosters' ||
      prefix === 'decks'
    ) {
      return prefix;
    }
    throw new Error(`unknown catalog file domain: ${name}`);
  }

  private computeDomainVersions(
    files: Array<{ name: string; sha256: string }>,
    deckRestrictionsVersion: number,
  ): DomainVersions {
    const hashesByDomain = new Map<CatalogDomain, string[]>();

    for (const file of files) {
      const domain = this.domainFromFileName(file.name);
      const existing = hashesByDomain.get(domain) ?? [];
      existing.push(file.sha256);
      hashesByDomain.set(domain, existing);
    }

    const versions = {} as DomainVersions;

    for (const domain of [
      'cards',
      'products',
      'lookups',
      'displays',
      'cases',
      'boosters',
      'decks',
      'doublePacks',
    ] as const) {
      const hashes = (hashesByDomain.get(domain) ?? []).sort();
      const combined = crypto
        .createHash('sha256')
        .update(hashes.join('|'))
        .digest('hex');
      versions[domain] = parseInt(combined.slice(0, 8), 16);
    }

    versions.deckRestrictions = deckRestrictionsVersion;

    return versions;
  }

  private deckRestrictionsPath(): string {
    return path.join(process.cwd(), 'catalog', 'deck_restrictions.json');
  }

  private buildDeckRestrictions(): Record<string, unknown> {
    const filePath = this.deckRestrictionsPath();

    if (!fs.existsSync(filePath)) {
      throw new Error(`deck restrictions catalog missing: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  /**
   * Domain version for deck combo rules (`YYYYMMVV`, e.g. 20260501).
   * Prefer `DECK_RESTRICTIONS_VERSION` env, then JSON `version`, then current month.
   */
  private resolveDeckRestrictionsVersion(doc: Record<string, unknown>): number {
    const fromEnv = process.env.DECK_RESTRICTIONS_VERSION;
    if (fromEnv && /^\d{8}$/.test(fromEnv)) {
      return Number(fromEnv);
    }

    const fromDoc = doc.version;
    if (typeof fromDoc === 'number' && fromDoc > 0) {
      return fromDoc;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return Number(`${yyyy}${mm}01`);
  }

  private async computeCatalogVersion(): Promise<number> {
    const fromEnv = process.env.CATALOG_VERSION;
    if (fromEnv && /^\d{8}$/.test(fromEnv)) return Number(fromEnv);

    // Fallback (falls ENV fehlt)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return Number(`${yyyy}${mm}01`);
  }


  private manifestEntry(name: string, jsonObj: any) {
    const json = JSON.stringify(jsonObj);
    const bytes = Buffer.byteLength(json, 'utf8');
    const sha256 = crypto.createHash('sha256').update(json).digest('hex');
    return {
      name,
      domain: this.domainFromFileName(name),
      url: `/catalog/${name}`,
      bytes,
      sha256,
    };
  }

  // ---------- Builders ----------

  private async buildCards(lang: Lang, version: number) {

    const rows = await this.ds.query(
      `
      SELECT
      l.card_localization_uid                 AS id,
      c.card_core_uid                         AS core_uid,

      -- parent/appearance
      e_app.product_localization_uid              AS product_localization_uid_appearance,
      sl_app.product_core_uid                     AS product_core_uid_appearance,

      -- allocation (can be parent or child)
      e_alloc.product_localization_uid            AS product_localization_uid_allocation,
      sl_alloc.product_core_uid                   AS product_core_uid_allocation,

      -- expose embedding uid for filtering/debug
      l.product_embedding_uid                     AS product_embedding_uid,

      c.card_core_index                       AS index,
      c.card_core_number                      AS number,
      c.card_core_variant_index               AS variant,
      c.card_core_print                       AS print,
      c.rarity_uid                            AS rarity_uid,
      c.art_uid                               AS art_uid,
      c.card_core_life_cost                   AS life_cost,
      c.card_core_power                       AS power,
      c.card_core_counter                     AS counter,
      c.card_core_block_icon                  AS block_icon,
      c.card_core_deck_limit                  AS deck_limit,

      l.card_localization_name                AS name,
      l.card_localization_effect              AS effect,
      l.card_localization_trigger             AS trigger,
      l.card_localization_type                AS type,
      l.card_localization_category            AS category,
      l.card_localization_attribute           AS attribute,
      l.card_localization_color               AS color_raw,
      l.card_localization_misprint            AS misprint_raw,
      l.card_localization_storage_key         AS image_key,
      l.card_localization_blur_hash           AS blur_hash,
      l.card_localization_image_sha256        AS image_sha256

      FROM card_localization l
      JOIN card_core c ON c.card_core_uid = l.card_core_uid

      -- Appearance: ALWAYS rank 0
      LEFT JOIN product_embedding e_app
        ON e_app.product_embedding_uid = l.product_embedding_uid
      AND e_app.language_uid = l.language_uid
      AND e_app.product_embedding_rank = 0

      LEFT JOIN product_localization sl_app
        ON sl_app.product_localization_uid = e_app.product_localization_uid

      -- Allocation: rank comes from card_localization_set_rank
      LEFT JOIN product_embedding e_alloc
        ON e_alloc.product_embedding_uid = l.product_embedding_uid2
      AND e_alloc.language_uid = l.language_uid
      AND e_alloc.product_embedding_rank = l.card_localization_set_rank

      LEFT JOIN product_localization sl_alloc
        ON sl_alloc.product_localization_uid = e_alloc.product_localization_uid

      WHERE l.language_uid = $1
      ORDER BY l.card_localization_name ASC;
      `,
      [lang],
    );

    const items = rows.map((r: any) => {

      const colorUids = this.parseColors(r.color_raw);
      const strOrNull = (v: any) => {
        if (v == null) return null;
        const s = String(v).trim();
        return s.length ? s : null;
      };

      return {
        id: r.id,             // card_localization_uid
        coreUid: r.core_uid,  // card_core_uid

        productCoreUidAppearance: r.product_core_uid_appearance ?? null,
        productCoreUidAllocation: r.product_core_uid_allocation ?? null,

        productAppearanceUid: r.product_localization_uid_appearance ?? null,
        productAllocationUid: r.product_localization_uid_allocation ?? null,

        name: r.name,
        effect: r.effect ?? null,
        trigger: r.trigger ?? null,

        index: r.index ?? null,
        number: r.number != null ? this.toInt(r.number) : null,
        variant: r.variant != null ? this.toInt(r.variant) : null,
        print: r.print ?? null,

        rarityUid: r.rarity_uid ?? null,
        artUid: r.art_uid ?? null,

        lifeCost: r.life_cost != null ? this.toInt(r.life_cost) : null,
        power: r.power != null ? this.toInt(r.power) : null,
        counter: r.counter != null ? this.toInt(r.counter) : null,
        blockIcon: r.block_icon != null ? this.toInt(r.block_icon) : null,
        deckLimit: r.deck_limit != null ? this.toInt(r.deck_limit) : 4,

        type: r.type ?? null,
        category: r.category ?? null,
        attribute: r.attribute ?? null,

        colorUids,
        misprint: this.toBool(r.misprint_raw),
        imageKey: strOrNull(r.image_key),
        blurHash: strOrNull(r.blur_hash),
        imageSha256Hash: strOrNull(r.image_sha256),
      };
    });
    
    return { lang, version, items };
  }

  private async buildProducts(lang: Lang, version: number) {
    const rows = await this.ds.query(
      `
      SELECT
        sl.product_localization_uid                 AS product_localization_uid,
        sc.product_core_code                        AS product_core_code,
        sc.product_core_type                        AS product_core_type,
        sl.product_localization_affiliation         AS product_localization_affiliation,
        sl.product_localization_designation         AS product_localization_designation,
        sl.product_localization_name                AS product_localization_name,
        sl.product_localization_date                AS product_localization_date
      FROM product_localization sl
      JOIN product_core sc ON sc.product_core_uid = sl.product_core_uid
      WHERE sl.language_uid = $1
      ORDER BY sc.product_core_code ASC
      `,
      [lang],
    );

    const items = rows.map((r: any) => ({
      productLocalizationUid: r.product_localization_uid,
      productCoreCode: r.product_core_code ?? '',
      productCoreType: r.product_core_type ?? '',
      productLocalizationAffiliation: r.product_localization_affiliation ?? null,
      productLocalizationDesignation: r.product_localization_designation ?? '',
      productLocalizationName: r.product_localization_name ?? '',
      releaseDate: r.product_localization_date ?? null,
    }));

    return { lang, version, items };
  }

  private async buildDisplays(lang: Lang, version: number) {
    const rows = await this.ds.query(
      `
      SELECT
        d.display_uid                             AS display_uid,
        d.display_number_of_boosters              AS number_of_boosters,
        d.display_number_of_cards                 AS number_of_cards,
        d.display_storage_key                     AS image_key,
        sl.product_localization_uid                   AS product_localization_uid,
        sl.product_core_uid                           AS product_core_uid,
        sc.product_core_code                          AS product_core_code,
        sc.product_core_type                          AS product_core_type,
        sl.product_localization_name                  AS set_name,
        sl.product_localization_designation           AS set_designation,
        sl.product_localization_affiliation           AS product_localization_affiliation,
        sl.product_localization_date                  AS release_date
      FROM product_localization sl
      JOIN product_core sc ON sc.product_core_uid = sl.product_core_uid
      JOIN display d
        ON d.display_uid = sl.display_uid
       AND d.language_uid = sl.language_uid
      WHERE sl.language_uid = $1
        AND sl.display_uid IS NOT NULL
        AND btrim(sl.display_uid) <> ''
      ORDER BY sc.product_core_code ASC, sl.product_localization_name ASC
      `,
      [lang],
    );

    const items = rows.map((r: any) => ({
      displayUid: r.display_uid,
      productLocalizationUid: r.product_localization_uid,
      productCoreUid: r.product_core_uid ?? '',
      productCoreCode: r.product_core_code ?? '',
      productCoreType: r.product_core_type ?? '',
      productName: r.set_name ?? '',
      productDesignation: r.set_designation ?? '',
      productLocalizationAffiliation: r.product_localization_affiliation ?? null,
      releaseDate: r.release_date ?? null,
      numberOfBoosters:
        r.number_of_boosters != null ? this.toInt(r.number_of_boosters) : null,
      numberOfCards:
        r.number_of_cards != null ? this.toInt(r.number_of_cards) : null,
      imageKey: this.productImageKey(r.image_key, r.display_uid),
    }));

    return { lang, version, items };
  }

  private async buildCases(lang: Lang, version: number) {
    const rows = await this.ds.query(
      `
      SELECT
        c.case_uid                                AS case_uid,
        c.case_number_of_displays                 AS number_of_displays,
        c.case_number_of_boosters                 AS number_of_boosters,
        c.case_number_of_cards                    AS number_of_cards,
        c.case_storage_key                        AS image_key,
        sl.product_localization_uid                   AS product_localization_uid,
        sl.product_core_uid                           AS product_core_uid,
        sc.product_core_code                          AS product_core_code,
        sc.product_core_type                          AS product_core_type,
        sl.product_localization_name                  AS set_name,
        sl.product_localization_designation           AS set_designation,
        sl.product_localization_affiliation           AS product_localization_affiliation,
        sl.product_localization_date                  AS release_date
      FROM product_localization sl
      JOIN product_core sc ON sc.product_core_uid = sl.product_core_uid
      JOIN "case" c
        ON c.case_uid = sl.case_uid
       AND c.language_uid = sl.language_uid
      WHERE sl.language_uid = $1
        AND sl.case_uid IS NOT NULL
        AND btrim(sl.case_uid) <> ''
      ORDER BY sc.product_core_code ASC, sl.product_localization_name ASC
      `,
      [lang],
    );

    const items = rows.map((r: any) => ({
      caseUid: r.case_uid,
      productLocalizationUid: r.product_localization_uid,
      productCoreUid: r.product_core_uid ?? '',
      productCoreCode: r.product_core_code ?? '',
      productCoreType: r.product_core_type ?? '',
      productName: r.set_name ?? '',
      productDesignation: r.set_designation ?? '',
      productLocalizationAffiliation: r.product_localization_affiliation ?? null,
      releaseDate: r.release_date ?? null,
      numberOfDisplays:
        r.number_of_displays != null ? this.toInt(r.number_of_displays) : null,
      numberOfBoosters:
        r.number_of_boosters != null ? this.toInt(r.number_of_boosters) : null,
      numberOfCards:
        r.number_of_cards != null ? this.toInt(r.number_of_cards) : null,
      imageKey: this.productImageKey(r.image_key, r.case_uid),
    }));

    return { lang, version, items };
  }

  private async buildBoosters(lang: Lang, version: number) {
    const rows = await this.ds.query(
      `
      SELECT
        b.booster_uid                              AS booster_uid,
        b.booster_number_of_cards                  AS number_of_cards,
        b.booster_image_storage_key                AS image_key,
        sl.product_localization_uid                    AS product_localization_uid,
        sl.product_core_uid                            AS product_core_uid,
        sc.product_core_code                           AS product_core_code,
        sc.product_core_type                           AS product_core_type,
        sl.product_localization_name                   AS set_name,
        sl.product_localization_designation            AS set_designation,
        sl.product_localization_affiliation            AS product_localization_affiliation,
        sl.product_localization_date                   AS release_date
      FROM product_localization sl
      JOIN product_core sc ON sc.product_core_uid = sl.product_core_uid
      JOIN booster b
        ON b.booster_uid = sl.booster_uid
       AND b.language_uid = sl.language_uid
      WHERE sl.language_uid = $1
        AND sl.booster_uid IS NOT NULL
        AND btrim(sl.booster_uid) <> ''
      ORDER BY sc.product_core_code ASC, sl.product_localization_name ASC
      `,
      [lang],
    );

    const items = rows.map((r: any) => ({
      boosterUid: r.booster_uid,
      productLocalizationUid: r.product_localization_uid,
      productCoreUid: r.product_core_uid ?? '',
      productCoreCode: r.product_core_code ?? '',
      productCoreType: r.product_core_type ?? '',
      productName: r.set_name ?? '',
      productDesignation: r.set_designation ?? '',
      productLocalizationAffiliation: r.product_localization_affiliation ?? null,
      releaseDate: r.release_date ?? null,
      numberOfCards:
        r.number_of_cards != null ? this.toInt(r.number_of_cards) : null,
      imageKey: this.productImageKey(r.image_key, r.booster_uid),
    }));

    return { lang, version, items };
  }

  private async buildDecks(lang: Lang, version: number) {
    const rows = await this.ds.query(
      `
      SELECT
        d.deck_uid                                   AS deck_uid,
        d.deck_number_of_packs                       AS number_of_packs,
        d.deck_number_of_cards_per_pack              AS number_of_cards_per_pack,
        d.deck_number_of_cards_per_deck              AS number_of_cards_per_deck,
        d.deck_total_amount_of_cards                 AS total_amount_of_cards,
        d.deck_image_storage_key                     AS image_key,
        sl.product_localization_uid                      AS product_localization_uid,
        sl.product_core_uid                              AS product_core_uid,
        sc.product_core_code                             AS product_core_code,
        sc.product_core_type                             AS product_core_type,
        sl.product_localization_name                     AS set_name,
        sl.product_localization_designation              AS set_designation,
        sl.product_localization_affiliation              AS product_localization_affiliation,
        sl.product_localization_date                     AS release_date
      FROM product_localization sl
      JOIN product_core sc ON sc.product_core_uid = sl.product_core_uid
      JOIN deck d
        ON d.deck_uid = sl.deck_uid
       AND d.language_uid = sl.language_uid
      WHERE sl.language_uid = $1
        AND sl.deck_uid IS NOT NULL
        AND btrim(sl.deck_uid) <> ''
      ORDER BY sc.product_core_code ASC, sl.product_localization_name ASC
      `,
      [lang],
    );

    const items = rows.map((r: any) => ({
      deckUid: r.deck_uid,
      productLocalizationUid: r.product_localization_uid,
      productCoreUid: r.product_core_uid ?? '',
      productCoreCode: r.product_core_code ?? '',
      productCoreType: r.product_core_type ?? '',
      productName: r.set_name ?? '',
      productDesignation: r.set_designation ?? '',
      productLocalizationAffiliation: r.product_localization_affiliation ?? null,
      releaseDate: r.release_date ?? null,
      numberOfPacks:
        r.number_of_packs != null ? this.toInt(r.number_of_packs) : null,
      numberOfCardsPerPack:
        r.number_of_cards_per_pack != null
          ? this.toInt(r.number_of_cards_per_pack)
          : null,
      numberOfCardsPerDeck:
        r.number_of_cards_per_deck != null
          ? this.toInt(r.number_of_cards_per_deck)
          : null,
      totalAmountOfCards:
        r.total_amount_of_cards != null
          ? this.toInt(r.total_amount_of_cards)
          : null,
      imageKey: this.productImageKey(r.image_key, r.deck_uid),
    }));

    return { lang, version, items };
  }

  private async buildDoublePacks(lang: Lang, version: number) {
    const rows = await this.ds.query(
      `
      SELECT
        dp.double_pack_uid                          AS double_pack_uid,
        dp.double_pack_number_of_boosters           AS number_of_boosters,
        dp.double_pack_number_of_pack               AS number_of_packs,
        dp.double_pack_number_of_cards              AS number_of_cards,
        dp.double_pack_storage_key                  AS image_key,
        sl.product_localization_uid                 AS product_localization_uid,
        sl.product_core_uid                         AS product_core_uid,
        sc.product_core_code                        AS product_core_code,
        sc.product_core_type                        AS product_core_type,
        sl.product_localization_name                AS set_name,
        sl.product_localization_designation         AS set_designation,
        sl.product_localization_affiliation         AS product_localization_affiliation,
        sl.product_localization_date                AS release_date
      FROM product_localization sl
      JOIN product_core sc ON sc.product_core_uid = sl.product_core_uid
      JOIN double_pack dp
        ON dp.double_pack_uid = sl.double_pack_uid
       AND dp.language_uid = sl.language_uid
      WHERE sl.language_uid = $1
        AND sl.double_pack_uid IS NOT NULL
        AND btrim(sl.double_pack_uid) <> ''
      ORDER BY sc.product_core_code ASC, sl.product_localization_name ASC
      `,
      [lang],
    );

    const items = rows.map((r: any) => ({
      doublePackUid: r.double_pack_uid,
      productLocalizationUid: r.product_localization_uid,
      productCoreUid: r.product_core_uid ?? '',
      productCoreCode: r.product_core_code ?? '',
      productCoreType: r.product_core_type ?? '',
      productName: r.set_name ?? '',
      productDesignation: r.set_designation ?? '',
      productLocalizationAffiliation: r.product_localization_affiliation ?? null,
      releaseDate: r.release_date ?? null,
      numberOfBoosters:
        r.number_of_boosters != null ? this.toInt(r.number_of_boosters) : null,
      numberOfPacks:
        r.number_of_packs != null ? this.toInt(r.number_of_packs) : null,
      numberOfCards:
        r.number_of_cards != null ? this.toInt(r.number_of_cards) : null,
      imageKey: this.productImageKey(r.image_key, r.double_pack_uid),
    }));

    return { lang, version, items };
  }

  private productImageKey(
    storageKey: unknown,
    productUid: unknown,
  ): string | null {
    const storage = String(storageKey ?? '').trim();
    if (storage) return this.normalizeCatalogProductImageKey(storage);

    const uid = String(productUid ?? '').trim();
    if (!uid) return null;
    return this.normalizeCatalogProductImageKey(uid);
  }

  /** Product UIDs use `u-` prefix; CDN filenames do not. */
  private normalizeCatalogProductImageKey(raw: string): string {
    const trimmed = raw.trim();
    return trimmed.startsWith('u-') ? trimmed.slice(2) : trimmed;
  }

  private async buildLookups(lang: Lang, version: number) {
    /*
    const debug = await this.ds.query(
      `
      SELECT language_uid, COUNT(*)::int AS n
      FROM color
      GROUP BY language_uid
      ORDER BY language_uid
      `
    );
    console.log("🎨 color langs in DB:", debug);
    console.log("🎯 requested lang:", lang);
    console.log("🎨 colors returned:", colors.length);
    */
    const colors = await this.ds.query(
      `
      SELECT color_uid AS uid, color_name, color_group
      FROM color
      WHERE language_uid = $1
      ORDER BY color_uid ASC
      `,
      [lang],
    );

    const rarities = await this.ds.query(
      `
      SELECT rarity_uid AS uid, rarity_name, rarity_abbreviation
      FROM rarity
      ORDER BY rarity_uid ASC
      `,
    );

    const arts = await this.ds.query(
      `
      SELECT art_uid AS uid, art_name, art_abbreviation, art_version
      FROM art
      ORDER BY art_uid ASC
      `,
    );

    return {
      lang,
      version,
      colors: colors.map((c: any) => ({
        uid: c.uid,
        color_name: c.color_name ?? '',
        color_group: c.color_group ?? '',
      })),
      rarities: rarities.map((r: any) => ({
        uid: r.uid,
        rarity_name: r.rarity_name ?? '',
        rarity_abbreviation: r.rarity_abbreviation ?? '',
      })),
      arts: arts.map((a: any) => ({
        uid: a.uid,
        art_name: a.art_name ?? '',
        art_abbreviation: a.art_abbreviation ?? '',
        art_version: a.art_version ?? null,
      })),
    };
  }

  private parseColors(raw: any): string[] | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    return s
      .split('/')
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  private toInt(v: any): number {
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : 0;
  }

  private toBool(v: any): boolean | null {
    if (v === null || v === undefined) return null;

    const s = String(v).trim().toLowerCase();
    if (!s) return null;

    if (['true', 't', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', 'f', '0', 'no', 'n'].includes(s)) return false;

    return null;
  }

}

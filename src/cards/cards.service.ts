import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardCore } from './card-core.entity';
import { CardLocalization } from './card-localization.entity';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(CardCore) private readonly coreRepo: Repository<CardCore>,
    @InjectRepository(CardLocalization) private readonly locRepo: Repository<CardLocalization>,
  ) {}

  /**
   * List cards for a given language with optional name search.
   * Returns items ready for card list screens.
   */
  async list(params: { q?: string; lang?: string; limit: number; offset: number }) {
    const lang = (params.lang ?? 'en').trim();
    const limit = params.limit;
    const offset = params.offset;

    // 1) Fetch localizations (language + optional search)
    const qb = this.locRepo
      .createQueryBuilder('l')
      .select([
        'l.cardCoreUid',
        'l.name',
        'l.storageKey',
        'l.type',
        'l.color',
        'l.category',
      ])
      .where('l.languageUid = :lang', { lang });

    if (params.q && params.q.trim().length > 0) {
      qb.andWhere('LOWER(l.name) LIKE :q', { q: `%${params.q.toLowerCase()}%` });
    }

    qb.orderBy('l.name', 'ASC').limit(limit).offset(offset);

    const locs = await qb.getMany();

    const coreIds = Array.from(new Set(locs.map((x) => x.cardCoreUid))).filter(Boolean);
    if (coreIds.length === 0) {
      return { items: [], nextOffset: null };
    }

    // 2) Fetch matching cores
    const cores = await this.coreRepo
      .createQueryBuilder('c')
      .where('c.cardCoreUid IN (:...ids)', { ids: coreIds })
      .getMany();

    const coreMap = new Map(cores.map((c) => [c.cardCoreUid, c]));

    // 3) Combine into list items
    const items = locs.map((l) => {
      const c = coreMap.get(l.cardCoreUid);

      return {
        id: l.cardCoreUid,
        name: l.name ?? null,
        imageStorageKey: l.storageKey ?? null,

        // From localization (good for filters)
        type: l.type ?? null,
        color: l.color ?? null,
        category: l.category ?? null,

        index: c?.cardCoreIndex ?? null,
        number: c?.cardCoreNumber ?? null,
        variantIndex: c?.cardCoreVariantIndex ?? null,
        print: c?.cardCorePrint ?? null,
        rarityUid: c?.rarityUid ?? null,
        artUid: c?.artUid ?? null,
        lifeCost: c?.lifeCost ?? null,
        power: c?.power ?? null,
        counter: c?.counter ?? null,
        blockIcon: c?.blockIcon ?? null,
        deckLimit: c?.deckLimit ?? 4,
      };
    });

    return {
      items,
      nextOffset: items.length === limit ? offset + limit : null,
    };
  }

  /**
   * Get a single card by id (card_core_uid) incl. ALL localizations.
   * Perfect for a card detail screen with language switch.
   */
  async getById(id: string) {
    const core = await this.coreRepo.findOne({ where: { cardCoreUid: id } });
    if (!core) return null;

    const locs = await this.locRepo
      .createQueryBuilder('l')
      .where('l.cardCoreUid = :id', { id })
      .orderBy('l.languageUid', 'ASC')
      .getMany();

    return {
      id: core.cardCoreUid,

      index: core.cardCoreIndex ?? null,
      number: core.cardCoreNumber ?? null,
      variantIndex: core.cardCoreVariantIndex ?? null,
      print: core.cardCorePrint ?? null,

      rarityUid: core.rarityUid ?? null,
      artUid: core.artUid ?? null,

      lifeCost: core.lifeCost ?? null,
      power: core.power ?? null,
      counter: core.counter ?? null,
      blockIcon: core.blockIcon ?? null,
      deckLimit: core.deckLimit,

      localizations: locs.map((l) => ({
        uid: l.cardLocalizationUid,
        languageUid: l.languageUid ?? null,

        name: l.name ?? null,
        effect: l.effect ?? null,
        trigger: l.trigger ?? null,

        type: l.type ?? null,
        color: l.color ?? null,
        attribute: l.attribute ?? null,
        category: l.category ?? null,
        misprint: l.misprint ?? null,

        storageKey: l.storageKey ?? null,
      })),
    };
  }
}


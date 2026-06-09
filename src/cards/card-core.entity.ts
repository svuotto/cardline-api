import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'card_core' })
export class CardCore {
  @PrimaryColumn({ name: 'card_core_uid', type: 'text' })
  cardCoreUid!: string;

  @Column({ name: 'card_core_index', type: 'text', nullable: true })
  cardCoreIndex!: string | null;

  @Column({ name: 'card_core_number', type: 'text', nullable: true })
  cardCoreNumber!: string | null;

  @Column({ name: 'card_core_variant_index', type: 'text', nullable: true })
  cardCoreVariantIndex!: string | null;

  @Column({ name: 'card_core_print', type: 'text', nullable: true })
  cardCorePrint!: string | null;

  @Column({ name: 'rarity_uid', type: 'text', nullable: true })
  rarityUid!: string | null;

  @Column({ name: 'art_uid', type: 'text', nullable: true })
  artUid!: string | null;

  @Column({ name: 'card_core_life_cost', type: 'text', nullable: true })
  lifeCost!: string | null;

  @Column({ name: 'card_core_power', type: 'text', nullable: true })
  power!: string | null;

  @Column({ name: 'card_core_counter', type: 'text', nullable: true })
  counter!: string | null;

  @Column({ name: 'card_core_block_icon', type: 'text', nullable: true })
  blockIcon!: string | null;

  @Column({ name: 'card_core_deck_limit', type: 'smallint' })
  deckLimit!: number;
}

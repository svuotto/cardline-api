import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity({ name: 'card_localization' })
@Index('ix_card_loc_lang', ['languageUid'])
@Index('ix_card_loc_core', ['cardCoreUid'])
export class CardLocalization {
  @PrimaryColumn({ name: 'card_localization_uid', type: 'text' })
  cardLocalizationUid!: string;

  @Column({ name: 'card_core_uid', type: 'text' })
  cardCoreUid!: string;

  @Column({ name: 'language_uid', type: 'text', nullable: true })
  languageUid!: string | null;

  @Column({ name: 'card_localization_name', type: 'text', nullable: true })
  name!: string | null;

  @Column({ name: 'card_localization_effect', type: 'text', nullable: true })
  effect!: string | null;

  @Column({ name: 'card_localization_trigger', type: 'text', nullable: true })
  trigger!: string | null;

  @Column({ name: 'card_localization_category', type: 'text', nullable: true })
  category!: string | null;

  @Column({ name: 'card_localization_color', type: 'text', nullable: true })
  color!: string | null;

  @Column({ name: 'card_localization_attribute', type: 'text', nullable: true })
  attribute!: string | null;

  @Column({ name: 'card_localization_type', type: 'text', nullable: true })
  type!: string | null;

  @Column({ name: 'card_localization_misprint', type: 'boolean', nullable: true })
  misprint!: boolean | null;

  @Column({ name: 'card_localization_storage_key', type: 'text', nullable: true })
  storageKey!: string | null;
}

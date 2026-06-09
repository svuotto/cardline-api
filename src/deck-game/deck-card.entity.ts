import {Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn,} from "typeorm";

@Entity("deck_card")
export class DeckCardEntity {
  @PrimaryColumn({ name: "deck_card_uid", type: "text" })
  deckCardUid!: string;

  @Column({ name: "deck_game_uid", type: "text" })
  deckGameUid!: string;

  @Column({ name: "card_localization_uid", type: "text" })
  cardLocalizationUid!: string;

  @Column({ name: "deck_card_section", type: "text" })
  deckCardSection!: "leader" | "main" | "don";

  @Column({ name: "deck_card_quantity", type: "int", default: 1 })
  deckCardQuantity!: number;

  @Column({ name: "deck_card_limit", type: "int", default: 4 })
  deckCardLimit!: number;

  @Column({ name: "deck_card_position_int", type: "int", default: 0 })
  deckCardPositionInt!: number;

  @CreateDateColumn({ name: "deck_card_added_at", type: "timestamptz" })
  deckCardAddedAt!: Date;

  @UpdateDateColumn({ name: "deck_card_updated_at", type: "timestamptz" })
  deckCardUpdatedAt!: Date;
}
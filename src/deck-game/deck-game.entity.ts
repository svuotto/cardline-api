import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("deck_game")
export class DeckGameEntity {
  @PrimaryColumn({ name: "deck_game_uid", type: "text" })
  deckGameUid!: string;

  @Column({ name: "user_uid", type: "text", nullable: true })
  userUid!: string | null;

  @Column({ name: "deck_game_name", type: "text" })
  deckGameName!: string;

  @Column({ name: "deck_game_format", type: "text", nullable: true })
  deckGameFormat!: string | null;

  @Column({ name: "deck_game_language_code", type: "text" })
  deckGameLanguageCode!: string;

  @Column({ name: "leader_card_localization_uid", type: "text", nullable: true })
  leaderCardLocalizationUid!: string | null;

  @Column({ name: "deck_game_source_type", type: "text", default: "user" })
  deckGameSourceType!: "user" | "tier";

  @Column({ name: "deck_game_is_public", type: "boolean", default: false })
  deckGameIsPublic!: boolean;

  @Column({ name: "deck_game_is_highlighted", type: "boolean", default: false })
  deckGameIsHighlighted!: boolean;

  @CreateDateColumn({ name: "deck_game_created_at", type: "timestamptz" })
  deckGameCreatedAt!: Date;

  @UpdateDateColumn({ name: "deck_game_updated_at", type: "timestamptz" })
  deckGameUpdatedAt!: Date;

  @Column({ name: "deck_game_removed_at", type: "timestamptz", nullable: true })
  deckGameRemovedAt!: Date | null;
}
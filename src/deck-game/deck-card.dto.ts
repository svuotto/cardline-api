export interface DeckCardDto {
  deckCardUid: string;
  deckGameUid: string;
  cardLocalizationUid: string;
  deckCardSection: "leader" | "main" | "don";
  deckCardQuantity: number;
  deckCardPositionInt: number;
  deckCardAddedAt: string;
  deckCardUpdatedAt: string;
  deckCardLimit: number;
}
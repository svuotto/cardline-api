export interface DeckGameDto {
  deckGameUid: string;
  userUid: string | null;
  deckGameName: string;
  deckGameFormat: string | null;
  deckGameLanguageCode: string;
  leaderCardLocalizationUid: string | null;
  deckGameSourceType: "user" | "tier" | "community";
  deckGameIsPublic: boolean;
  deckGameIsHighlighted: boolean;
  deckGameCreatedAt: string;
  deckGameUpdatedAt: string;
  deckGameRemovedAt: string | null;
}
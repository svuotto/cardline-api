import { DeckGameDto } from "./deck-game.dto";
import { DeckCardDto } from "./deck-card.dto";
import { DeckGameValidationDto } from "./deck-game-validation.dto";

export interface DeckGameDetailDto {
  deck: DeckGameDto;
  cards: DeckCardDto[];
  validation: DeckGameValidationDto;
}
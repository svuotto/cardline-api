import { IsString, MaxLength } from "class-validator";

export class DeckNameValidateDto {
  @IsString()
  @MaxLength(25)
  deckGameName!: string;
}
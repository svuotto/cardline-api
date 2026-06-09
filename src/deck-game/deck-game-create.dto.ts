import { IsOptional, IsString, MaxLength } from "class-validator";

export class DeckGameCreateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deckGameName?: string;

  @IsString()
  @MaxLength(10)
  deckGameLanguageCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  deckGameFormat?: string;
}
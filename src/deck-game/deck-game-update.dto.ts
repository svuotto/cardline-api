import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { DeckCardUpsertInput } from "./deck-card-upsert.input";

export class DeckGameUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deckGameName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  deckGameLanguageCode?: string;

  @IsOptional()
  @IsString()
  leaderCardLocalizationUid?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  deckGameFormat?: string;

  @IsOptional()
  @IsBoolean()
  deckGameIsPublic?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeckCardUpsertInput)
  cards!: DeckCardUpsertInput[];
}
import { IsIn, IsInt, IsString, Min } from "class-validator";

export class DeckCardUpsertInput {
  @IsString()
  cardLocalizationUid!: string;

  @IsIn(["leader", "main", "don"])
  deckCardSection!: "leader" | "main" | "don";

  @IsInt()
  @Min(1)
  deckCardQuantity!: number;

  @IsInt()
  @Min(0)
  deckCardLimit!: number;

  @IsInt()
  @Min(0)
  deckCardPositionInt!: number;
}
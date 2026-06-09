import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class UpsertInventoryCardDto {
  @IsString()
  @IsNotEmpty()
  cardCoreUid!: string;

  @IsString()
  @IsNotEmpty()
  lang!: string;

  @IsInt()
  @Min(0)
  @Max(9999999)
  quantity!: number;
}
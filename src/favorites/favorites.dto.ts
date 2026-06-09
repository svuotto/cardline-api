import { IsString } from "class-validator";

export class AddFavoriteDto {
  @IsString()
  cardCoreUid!: string;
}

export class FavoriteResponseDto {
  cardCoreUid!: string;
}
export interface DeckGameValidationDto {
  isValid: boolean;
  leaderCount: number;
  mainCount: number;
  donCount: number;
  errors: string[];
  warnings: string[];
}
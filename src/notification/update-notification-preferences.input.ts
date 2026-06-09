import { IsBoolean } from "class-validator";

export class UpdateNotificationPreferencesInput {
  @IsBoolean()
  notifyNewProducts!: boolean;

  @IsBoolean()
  notifyTierDecks!: boolean;
}

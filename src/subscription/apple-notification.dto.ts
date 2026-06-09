import { IsString } from "class-validator";

export class AppleNotificationDto {
  @IsString()
  signedPayload!: string;
}
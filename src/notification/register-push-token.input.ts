import { IsIn, IsOptional, IsString } from "class-validator";

export class RegisterPushTokenInput {
  @IsString()
  pushToken!: string;

  @IsIn(["ios"])
  platform!: "ios";

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
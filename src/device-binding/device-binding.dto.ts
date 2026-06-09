import { IsBoolean, IsOptional, IsString } from "class-validator";

export class EnsureDeviceBindingDto {
  @IsString()
  deviceId!: string;

  @IsString()
  secret!: string;

  @IsOptional()
  @IsString()
  deviceLabel?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsBoolean()
  biometricProtected?: boolean;
}

export class RecoverWithDeviceDto {
  @IsString()
  username!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  secret!: string;
}
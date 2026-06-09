import { IsIn, IsEmail, IsDateString, IsOptional, IsString, Length, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  preferredAppLang?: string | null;

  @IsOptional()
  @IsString()
  preferredCardLang?: string;
}

export class CompleteProfileDto {
  @IsDateString()
  birthDate!: string;

  @IsString()
  username!: string;
}

export class VerifyEmailDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]+$/, { message: "Code must contain only digits" })
  token!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

export class GoogleLoginDto {
  @IsString()
  idToken!: string
}

export class VerifyPendingEmailChangeDto {
  @IsString()
  token!: string;
}

export class UpdateEmailAfterRecoveryDto {
  @IsEmail()
  currentEmail!: string;

  @IsEmail()
  newEmail!: string;
}

export class InitiateEmailChangeDto {
  @IsEmail()
  newEmail!: string;
}

export class RevokeEmailChangeQueryDto {
  @IsString()
  token!: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}

export class UpdateUsernameDto {
  @IsString()
  username!: string;
}

export class UpdateLanguagePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(["en", "fr", "de", "it", "es", "pt", "zh-Hans", "ja"])
  preferredAppLang?: string | null;

  /** Device-resolved locale when preferredAppLang is null (System). Used for push notifications. */
  @IsOptional()
  @IsString()
  @IsIn(["en", "fr", "de", "it", "es", "pt", "zh-Hans", "ja"])
  effectiveAppLang?: string | null;

  @IsString()
  @IsIn(["en", "fr", "ja"])
  preferredCardLang!: string;
}
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import type { FeedbackStatus } from "./feedback.entity";
import { Type } from "class-transformer";

const BUG_CATEGORIES = [
  "crash",
  "ui",
  "account",
  "sync",
  "subscription",
  "performance",
  "other",
] as const;

export class BugScreenshotDto {
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsString()
  @MaxLength(6_000_000)
  dataBase64!: string;
}

export class SubmitBugReportDto {
  @IsString()
  @IsIn(BUG_CATEGORIES)
  category!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;

  @IsString()
  @MaxLength(200)
  deviceName!: string;

  @IsString()
  @MaxLength(50)
  iosVersion!: string;

  @IsString()
  @MaxLength(50)
  appVersion!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => BugScreenshotDto)
  screenshots?: BugScreenshotDto[];
}

export class SubmitHelpRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;
}

export class ListHelpRequestsQueryDto {
  @IsString()
  @IsIn(["open", "closed"])
  status!: FeedbackStatus;
}

/** @deprecated Use SubmitHelpRequestDto */
export class SubmitSupportFeedbackDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;
}

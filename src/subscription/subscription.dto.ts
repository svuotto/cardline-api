import { IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class ActivateAppleSubscriptionDto {
  @IsString()
  transactionId!: string;

  @IsOptional()
  @IsString()
  originalTransactionId?: string;

  @IsString()
  productId!: string;

  @IsISO8601()
  purchaseDate!: string;

  @IsISO8601()
  expirationDate!: string;

  @IsOptional()
  @IsISO8601()
  revocationDate?: string;

  @IsUUID()
  appAccountToken!: string;
}
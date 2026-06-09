import { Injectable } from "@nestjs/common";
import { AppUserEntity } from "../user/user.entity";
import { SubscriptionService } from "../subscription/subscription.service";

type FeeContext = {
  hasReferralDiscount: boolean;
  hasSalesBonus: boolean;
};

type FeeBreakdown = {
  baseFeePct: number;
  subscriptionDiscountPct: number;
  referralDiscountPct: number;
  salesBonusDiscountPct: number;
  finalFeePct: number;
};

@Injectable()
export class FeeService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) {}

  calculateSellerFee(user: AppUserEntity, ctx: FeeContext): FeeBreakdown {
    const baseFeePct = 6;

    const subscriptionDiscountPct = this.subscriptionService.isPremiumActive(user) ? 1 : 0;
    const referralDiscountPct = ctx.hasReferralDiscount ? 1 : 0;
    const salesBonusDiscountPct = ctx.hasSalesBonus ? 1 : 0;

    const finalFeePct = Math.max(
      3,
      baseFeePct - subscriptionDiscountPct - referralDiscountPct - salesBonusDiscountPct,
    );

    return {
      baseFeePct,
      subscriptionDiscountPct,
      referralDiscountPct,
      salesBonusDiscountPct,
      finalFeePct,
    };
  }
}
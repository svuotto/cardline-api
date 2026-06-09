import { Controller, Get, Req, UseGuards, NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { UserService } from "../user/user.service";
import { FeeService } from "./fee.service";

@Controller("fee")
export class FeeController {
  constructor(
    private readonly feeService: FeeService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMyFeeBreakdown(@Req() req: any) {
    const user = await this.userService.findById(req.user.userUid);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const fee = this.feeService.calculateSellerFee(user, {
      hasReferralDiscount: false,
      hasSalesBonus: false,
    });

    return {
      ok: true,
      serviceFee: {
        baseFeePct: fee.baseFeePct,
        subscriptionDiscountPct: fee.subscriptionDiscountPct,
        referralDiscountPct: fee.referralDiscountPct,
        salesBonusDiscountPct: fee.salesBonusDiscountPct,
        currentFinalFeePct: fee.finalFeePct,
        minimumPossibleFeePct: 3,
        subscriptionUnlocked: fee.subscriptionDiscountPct > 0,
        referralUnlocked: fee.referralDiscountPct > 0,
        salesBonusUnlocked: fee.salesBonusDiscountPct > 0,
      },
    };
  }
}
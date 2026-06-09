import { Body, Controller, Post, Req, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SubscriptionService } from "./subscription.service";
import { ActivateAppleSubscriptionDto } from "./subscription.dto";
import { AppleNotificationDto } from "./apple-notification.dto";
import { SubscriptionReplayService } from "./subscription-replay.service";

@Controller("subscription")
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly replayService: SubscriptionReplayService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("apple/activate")
  async activateAppleSubscription(
    @Req() req: any,
    @Body() dto: ActivateAppleSubscriptionDto,
  ) {
    return this.subscriptionService.activateAppleSubscription(
      req.user.userUid,
      dto,
    );
  }

  @Post("apple/notifications")
  async handleAppleNotification(@Body() dto: AppleNotificationDto) {
    return this.subscriptionService.handleAppleNotification(dto.signedPayload);
  }

  /* FÜR TESTZWECKE */
  @Get("apple/replay")
  async replay() {
    return this.replayService.replayNotifications(
      new Date(Date.now() - 1000 * 60 * 60 * 24) // letzte 24h
    );
  }
}
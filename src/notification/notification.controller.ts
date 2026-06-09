import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { NotificationService } from "./notification.service";
import { RegisterPushTokenInput } from "./register-push-token.input";
import { UpdateNotificationPreferencesInput } from "./update-notification-preferences.input";

@UseGuards(JwtAuthGuard)
@Controller("notification")
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
  ) {}

  @Get("me")
  async getMine(@Req() req: any) {
    return this.service.getMine(req.user.userUid);
  }

  @Get("me/unread-count")
  async getUnreadCount(@Req() req: any) {
    return this.service.getUnreadCount(req.user.userUid);
  }

  @Post("me/:notificationUid/read")
  async markRead(
    @Req() req: any,
    @Param("notificationUid") notificationUid: string,
  ) {
    return this.service.markRead(req.user.userUid, notificationUid);
  }

  @Post("me/read-all")
  async markAllRead(@Req() req: any) {
    return this.service.markAllRead(req.user.userUid);
  }

  @Post("push-token")
  async registerPushToken(@Req() req: any, @Body() dto: RegisterPushTokenInput, ) {
    return this.service.registerPushToken(
      req.user.userUid,
      dto,
    );
  }

  @Get("me/preferences")
  async getPreferences(@Req() req: any) {
    return this.service.getPreferences(req.user.userUid);
  }

  @Put("me/preferences")
  async updatePreferences(
    @Req() req: any,
    @Body() dto: UpdateNotificationPreferencesInput,
  ) {
    return this.service.updatePreferences(req.user.userUid, dto);
  }

  // --- DEV TEST ONLY (nur für Testzwecke, später löschen) ---

  @Public()
  @Post("dev/test/:userUid")
  async sendDevTest(@Param("userUid") userUid: string) {
    return this.service.sendDevTestNotification(userUid);
  }
}
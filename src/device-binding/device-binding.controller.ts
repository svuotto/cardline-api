import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { DeviceBindingService } from "./device-binding.service";
import { EnsureDeviceBindingDto, RecoverWithDeviceDto } from "./device-binding.dto";

@Controller("device-binding")
export class DeviceBindingController {
  constructor(
    private readonly deviceBindingService: DeviceBindingService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("ensure")
  async ensure(@Req() req: any, @Body() dto: EnsureDeviceBindingDto) {
    return this.deviceBindingService.ensureForUser(req.user.userUid, dto);
  }

  @Post("recover")
  async recover(@Req() req: any, @Body() dto: RecoverWithDeviceDto) {
    return this.deviceBindingService.recoverWithDevice(dto, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      deviceLabel: undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async listMine(@Req() req: any) {
    return this.deviceBindingService.listBindingsForUser(req.user.userUid);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":userDeviceBindingUid")
  async revokeMine(@Req() req: any, @Param("userDeviceBindingUid") userDeviceBindingUid: string) {
    return this.deviceBindingService.revokeBindingByUid(req.user.userUid, userDeviceBindingUid);
  }
}
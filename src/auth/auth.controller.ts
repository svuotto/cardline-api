import { Body, Controller, Get, Delete, Post, Query, Req, Patch, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  CompleteProfileDto,
  VerifyEmailDto,
  RefreshDto,
  LoginDto,
  VerifyPendingEmailChangeDto,
  UpdateEmailAfterRecoveryDto,
  InitiateEmailChangeDto,
  RevokeEmailChangeQueryDto,
  LogoutDto,
  GoogleLoginDto,
  UpdateLanguagePreferencesDto,
  UpdateUsernameDto
} from "./auth.dto";
import { JwtAuthGuard, RecoveryJwtGuard, SessionOrRecoveryJwtGuard } from "./jwt.guard";
import { GoogleAuthService } from './google-auth.service'

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private googleAuthService: GoogleAuthService
  ) {}

  private deviceLabelFrom(req: Request): string | undefined {
    const v = req.header("x-device-label");
    return v?.trim() ? v.trim() : undefined;
  }

  @Post("register")
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, {
      userAgent: req.headers["user-agent"] as string | undefined,
      ip: req.ip,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("complete-profile")
  async completeProfile(@Body() dto: CompleteProfileDto, @Req() req: any) {
    return this.auth.completeProfile(req.user.userUid, dto);
  }

  @Post("verify-email")
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    return this.auth.verifyEmail(dto.token, {
      deviceLabel: this.deviceLabelFrom(req),
      userAgent: req.headers["user-agent"] as string | undefined,
      ip: req.ip,
    });
  }

  @Get("verify-email")
  async verifyEmailGet(@Query("token") token: string) {
    return {
      ok: true,
      message: "Open the app and paste the code to verify.",
      token, // optional (nur fürs Debug, später entfernen)
    };
  }
  
  @Post("refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.requestLoginLink(dto.email, {
      deviceLabel: dto.deviceLabel,
      userAgent: req.headers["user-agent"] as string | undefined,
      ip: req.ip,
    });
  }

  @Post("update-email-after-recovery")
  @UseGuards(RecoveryJwtGuard)
  async updateEmailAfterRecovery(@Req() req: any, @Body() dto: UpdateEmailAfterRecoveryDto) {
    return this.auth.updateEmailAfterRecovery(req.user.userUid, dto);
  }

  @Post("verify-pending-email-change")
  @UseGuards(SessionOrRecoveryJwtGuard)
  async verifyPendingEmailChange(@Req() req: any, @Body() dto: VerifyPendingEmailChangeDto) {
    const finalizeImmediately = req.user.type === "access";
    return this.auth.verifyPendingEmailChange(req.user.userUid, dto.token, {
      finalizeImmediately,
    });
  }

  @Post("resend-pending-email-change-code")
  @UseGuards(SessionOrRecoveryJwtGuard)
  async resendPendingEmailChangeCode(@Req() req: any) {
    return this.auth.resendPendingEmailChangeCode(req.user.userUid);
  }

  @Post("initiate-email-change")
  @UseGuards(JwtAuthGuard)
  async initiateEmailChange(@Req() req: any, @Body() dto: InitiateEmailChangeDto) {
    return this.auth.initiateEmailChange(req.user.userUid, dto);
  }

  @Post("revoke-pending-email-change")
  @UseGuards(JwtAuthGuard)
  async revokePendingEmailChange(@Req() req: any) {
    return this.auth.revokePendingEmailChange(req.user.userUid);
  }

  @Get("revoke-email-change")
  async revokeEmailChangeByTokenFromQuery(@Query() dto: RevokeEmailChangeQueryDto) {
    return this.auth.revokePendingEmailChangeByToken(dto.token);
  }

  @Post("logout")
  async logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  async logoutAll(@Req() req: any) {
    return this.auth.logoutAll(req.user.userUid);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: any) {
    return this.auth.me(req.user.userUid);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("me")
  async deleteMe(@Req() req: any) {
    return this.auth.deleteMe(req.user.userUid);
  }

  @UseGuards(JwtAuthGuard)
  @Post("request-account-deletion")
  async requestAccountDeletion(@Req() req: any) {
    return this.auth.requestAccountDeletion(req.user.userUid);
  }

  @UseGuards(JwtAuthGuard)
  @Post("confirm-account-deletion")
  async confirmAccountDeletion(@Req() req: any, @Body() dto: VerifyEmailDto) {
    return this.auth.confirmAccountDeletion(req.user.userUid, dto.token);
  }

  @Post("google")
  async googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    const googleUser = await this.googleAuthService.verifyGoogleToken(dto.idToken);
    
    return this.auth.loginWithGoogle(googleUser, {
      userAgent: req.headers["user-agent"] as string | undefined,
      ip: req.ip,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch("preferences")
  updateLanguagePreferences(@Req() req: any, @Body() dto: UpdateLanguagePreferencesDto) {
    return this.auth.updateLanguagePreferences(req.user.userUid, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("username-available")
  async usernameAvailable(@Query("username") username?: string) {
    return this.auth.usernameAvailable(username ?? "");
  }

  @Post("update-username")
  @UseGuards(JwtAuthGuard)
  async updateUsername(@Req() req: any, @Body() dto: UpdateUsernameDto) {
    return this.auth.updateUsername(req.user.userUid, dto);
  }

}
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { UserModule } from "../user/user.module";
import { CommonModule } from "../common/common.module";

import { EmailVerificationTokenEntity } from "./email-verification-token.entity";
import { AuthSessionEntity } from "./auth-session.entity";
import { EmailChangeRevokeTokenEntity } from "./email-change-revoke-token.entity";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsernameBlocklistService } from "./username-blocklist.service";
import { JwtStrategy } from "./jwt.strategy";
import { GoogleAuthService } from "./google-auth.service";

import { AppUserEntity } from "src/user/user.entity";

@Module({
  imports: [
    ConfigModule,
    UserModule,
    CommonModule,
    TypeOrmModule.forFeature([
      AppUserEntity,
      EmailVerificationTokenEntity,
      AuthSessionEntity,
      EmailChangeRevokeTokenEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UsernameBlocklistService,
    GoogleAuthService,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
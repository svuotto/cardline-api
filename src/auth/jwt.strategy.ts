import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

type JwtPayload = {
  sub: string;
  email?: string;
  type?: string;
  iat: number;
  exp: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>("JWT_ACCESS_SECRET"),
    });
  }

  validate(payload: JwtPayload) {
    return {
      userUid: payload.sub,
      email: payload.email ?? null,
      type: payload.type ?? "access",
    };
  }
}
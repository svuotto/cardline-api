import { Injectable, UnauthorizedException } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class GoogleAuthService {

  private client: OAuth2Client

  constructor(private config: ConfigService) {
    this.client = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID')
    )
  }

  async verifyGoogleToken(idToken: string) {

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID')
    })

    const payload = ticket.getPayload()

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token')
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified')
    }

    return {
      googleSub: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name
    }
  }
}


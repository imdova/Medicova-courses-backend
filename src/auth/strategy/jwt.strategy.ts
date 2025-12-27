import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Try to extract from cookies first (for same-domain requests)
        (req: Request) => {
          const cookieToken = req.cookies?.access_token;
          if (cookieToken) {
            return cookieToken;
          }
          return null;
        },
        // 2. Fallback to Authorization header (for cross-origin requests)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      isEmailVerified: payload.isEmailVerified,
      academyId: payload.academyId,
      departmentId: payload.departmentId,
      permissions: payload.permissions,
    };
  }
}
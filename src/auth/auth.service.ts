import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User, UserRole } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService, // Access JWT service to create tokens
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(
        "Email address you entered isn't connected to an account.",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password is invalid.');
    }

    return user;
  }

  async generateToken(user: User) {
    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '15m',
    });

    const refreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    user.refreshToken = hashedRefreshToken;
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      userInfo: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateOAuthLogin(
    email: string,
    provider: string,
    profile: any,
  ): Promise<any> {
    if (!email) {
      throw new UnauthorizedException(
        'No email associated with this Facebook account.',
      );
    }

    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      const fullName = `${profile.name.givenName || ''} ${
        profile.name.middleName || ''
      } ${profile.name.familyName || ''}`.trim();

      user = this.userRepository.create({
        email,
        password: '', // No password for OAuth
        role: UserRole.STUDENT,
      });

      await this.userRepository.save(user);
    }

    return this.generateToken(user);
  }

  async refreshToken(token: string) {
    const user = await this.userRepository.findOne({
      where: { refreshToken: Not(IsNull()) },
    });
    if (!user) {
      throw new UnauthorizedException('No user found for refresh token');
    }

    const isMatch = await bcrypt.compare(token, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateToken(user);
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { refreshToken: null });
    return { message: 'Logged out successfully' };
  }
}

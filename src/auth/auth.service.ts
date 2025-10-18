import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../user/entities/roles.entity';
import { EmailService } from '../common/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService, // Access JWT service to create tokens
    private configService: ConfigService,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private readonly emailService: EmailService,
  ) { }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['academy', 'role', 'role.rolePermissions', 'role.rolePermissions.permission', 'profile'],
    });

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
    // Reload user with required relations
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: [
        'role',
        'role.rolePermissions',
        'role.rolePermissions.permission',
        'profile',
        'academy',
      ],
    });

    if (!fullUser) {
      throw new NotFoundException('User not found while generating token');
    }

    const payload = {
      sub: fullUser.id,
      role: fullUser.role?.name ?? null,
      academyId: fullUser.academy?.id ?? null,
      isEmailVerified: fullUser.isEmailVerified ?? null,
      permissions: fullUser.role?.rolePermissions?.map(
        (rp) => rp.permission.name,
      ) ?? [],
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '15m',
    });

    const refreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Calculate expiration time (7 days from now)
    const refreshTokenExpiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);

    // Update user with new refresh token and expiration
    fullUser.refreshToken = hashedRefreshToken;
    fullUser.refreshTokenExpiresAt = refreshTokenExpiresAt;
    await this.userRepository.save(fullUser);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role.name,
        firstName: fullUser.profile?.firstName ?? null,
        lastName: fullUser.profile?.lastName ?? null,
        userName: fullUser.profile?.userName ?? null,
        photo: fullUser.profile?.photoUrl ?? null,
      },
      academy: {
        id: fullUser.academy?.id ?? null,
        name: fullUser.academy?.name ?? null,
        slug: fullUser.academy?.slug ?? null,
        image: fullUser.academy?.image ?? null,
        description: fullUser.academy?.description ?? null,
      }
    };
  }

  async validateOAuthLogin(
    email: string,
    provider: string,
    profile: any,
  ): Promise<any> {
    if (!email) {
      throw new UnauthorizedException(
        `No email associated with this ${provider} account.`,
      );
    }

    let user = await this.userRepository.findOne({ where: { email } });

    //Get role entity
    const roleEntity = await this.roleRepository.findOne({
      where: { name: 'academy_admin' }, // or whatever role name
    });

    if (!roleEntity) {
      throw new NotFoundException('Role academy_admin not found');
    }

    if (!user) {
      user = this.userRepository.create({
        email,
        password: '', // No password for OAuth
        role: roleEntity,
      });

      await this.userRepository.save(user);
    }

    return this.generateToken(user);
  }

  async refreshToken(token: string) {
    // Get all users that have non-expired refresh tokens
    const users = await this.userRepository.find({
      where: {
        refreshToken: Not(IsNull()),
        refreshTokenExpiresAt: Not(IsNull())
      },
    });

    // Check each user's hashed refresh token and expiration
    let user: User | null = null;
    for (const u of users) {
      if (u.refreshToken && u.refreshTokenExpiresAt) {
        // Check if token is expired
        if (Date.now() > u.refreshTokenExpiresAt) {
          // Token is expired, clean it up
          await this.userRepository.update(u.id, {
            refreshToken: null,
            refreshTokenExpiresAt: null
          });
          continue;
        }

        // Check if the provided token matches the stored hash
        if (await bcrypt.compare(token, u.refreshToken)) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens (this will also update the expiration time)
    return this.generateToken(user);
  }

  async refreshTokenNormal(token: string) {
    // Find a user whose refresh token matches
    const users = await this.userRepository.find({
      where: {
        refreshToken: Not(IsNull()),
        refreshTokenExpiresAt: Not(IsNull()),
      },
      relations: ['role',
        'role.rolePermissions',
        'role.rolePermissions.permission',
        'profile',
        'academy']
    });

    let user: User | null = null;

    for (const u of users) {
      if (u.refreshToken && u.refreshTokenExpiresAt) {
        // Expired refresh token cleanup
        if (Date.now() > u.refreshTokenExpiresAt) {
          await this.userRepository.update(u.id, {
            refreshToken: null,
            refreshTokenExpiresAt: null,
          });
          continue;
        }

        // Check token validity
        if (await bcrypt.compare(token, u.refreshToken)) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // ✅ Only generate a new access token — not a new refresh token
    const payload = {
      sub: user.id,
      role: user.role?.name ?? null,
      academyId: user.academy?.id ?? null,
      isEmailVerified: user.isEmailVerified ?? null,
      permissions: user.role?.rolePermissions?.map(
        (rp) => rp.permission.name,
      ) ?? [],
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '15m',
    });

    // Return existing refresh token (so frontend keeps using it)
    return {
      access_token: accessToken,
      refresh_token: token, // same token as provided
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name ?? null,
        firstName: user.profile?.firstName ?? null,
        lastName: user.profile?.lastName ?? null,
        userName: user.profile?.userName ?? null,
        photo: user.profile?.photoUrl ?? null,
      },
    };
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { refreshToken: null, refreshTokenExpiresAt: null });
    return { message: 'Logged out successfully' };
  }

  async sendPasswordResetEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });

    // For security, do not reveal if user exists
    if (!user) return;

    // Generate a UUID token (like your refresh token)
    const resetToken = uuidv4();
    const hashedResetToken = await bcrypt.hash(resetToken, 10);

    // Expiration: 1 hour
    const expiresAt = Date.now() + 60 * 60 * 1000;

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpiresAt = expiresAt;
    await this.userRepository.save(user);

    // Build frontend reset URL
    const resetUrl = `https://courses.medicova.net/reset-password?token=${resetToken}`;

    // Send email via your EmailService
    await this.emailService.sendEmail({
      from: process.env.SMTP_DEMO_EMAIL,
      to: user.email,
      subject: 'Reset your Medicova Courses password',
      template: 'reset-password',
      context: {
        name: user.profile?.firstName || user.email,
        resetUrl,
      },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    // Find all users who have a reset token stored
    const users = await this.userRepository.find({
      where: {
        passwordResetToken: Not(IsNull()),
        passwordResetExpiresAt: Not(IsNull()),
      },
    });

    let user: User | null = null;

    for (const u of users) {
      // Check expiration
      if (Date.now() > u.passwordResetExpiresAt) {
        await this.userRepository.update(u.id, {
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        });
        continue;
      }

      // Compare token hashes
      const isMatch = await bcrypt.compare(token, u.passwordResetToken);
      if (isMatch) {
        user = u;
        break;
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;

    // Optional: invalidate refresh tokens
    user.refreshToken = null;
    user.refreshTokenExpiresAt = null;

    await this.userRepository.save(user);
  }
}

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Role } from 'src/user/entities/roles.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService, // Access JWT service to create tokens
    private configService: ConfigService,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
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
    const payload = {
      sub: user.id,
      role: user.role.name,
      academyId: user.academy?.id,
      permissions: user.role.rolePermissions.map(rp => rp.permission.name),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '15m',
    });

    const refreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    user.refreshToken = hashedRefreshToken;
    await this.userRepository.save(user);

    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['profile'],
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role,
        firstName: fullUser.profile?.firstName ?? null,
        lastName: fullUser.profile?.lastName ?? null,
        userName: fullUser.profile?.userName ?? null,
        photo: fullUser.profile?.photoUrl ?? null,
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

  async refreshToken(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('No refresh token found for user');
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

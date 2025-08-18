import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Req,
  Res,
  Get,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface JwtPayload {
  sub: string;
  role: string;
}

const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login with email and password' })
  async login(
    @Body() body: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = body;

    if (!email) {
      throw new BadRequestException('Email must be provided.');
    }

    const user = await this.authService.validateUser(email, password);
    const { accessToken, refreshToken, userInfo } =
      await this.authService.generateToken(user);

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Login successful', user: userInfo };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) throw new BadRequestException('No refresh token found');

    const {
      accessToken,
      refreshToken: newRefreshToken,
      userInfo,
    } = await this.authService.refreshToken(refreshToken);

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Token refreshed', user: userInfo };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user and clear cookies' })
  async logout(
    @Req() req: Request & { user?: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user?.sub);

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return { message: 'Logged out successfully' };
  }
}

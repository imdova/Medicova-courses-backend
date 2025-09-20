import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Req,
  Res,
  Get,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';

interface JwtPayload {
  sub: string;
  role: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

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

    const normalizedEmail = email.trim().toLowerCase();

    const dbUser = await this.authService.validateUser(
      normalizedEmail,
      password,
    );
    const { access_token, refresh_token, user } =
      await this.authService.generateToken(dbUser);

    const isProduction = process.env.NODE_ENV === 'production';

    // Set cookies for same-domain requests
    const secureFlag = isProduction ? '; Secure' : '';
    const sameSiteFlag = isProduction ? '; SameSite=None' : '; SameSite=Lax'; // None for cross-origin

    const accessTokenCookie = `access_token=${access_token}; HttpOnly; Path=/; Max-Age=900${sameSiteFlag}${secureFlag}`;
    const refreshTokenCookie = `refresh_token=${refresh_token}; HttpOnly; Path=/; Max-Age=604800${sameSiteFlag}${secureFlag}`;

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    return {
      message: 'Login successful',
      user,
      // Return tokens for cross-origin requests
      tokens: {
        access_token,
        refresh_token,
        expires_in: 900 // 15 minutes
      }
    };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  async refresh(
    @Req() req: Request & { user?: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'] || req.body.refresh_token;
    const userId = req.user?.sub;

    if (!refreshToken || !userId) {
      throw new BadRequestException('No refresh token or user ID found');
    }

    const { access_token, refresh_token, user } =
      await this.authService.refreshToken(userId, refreshToken);

    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';
    const sameSiteFlag = isProduction ? '; SameSite=None' : '; SameSite=Lax';

    const accessTokenCookie = `access_token=${access_token}; HttpOnly; Path=/; Max-Age=900${sameSiteFlag}${secureFlag}`;
    const refreshTokenCookie = `refresh_token=${refresh_token}; HttpOnly; Path=/; Max-Age=604800${sameSiteFlag}${secureFlag}`;

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

    return {
      message: 'Token refreshed',
      user,
      tokens: {
        access_token,
        refresh_token,
        expires_in: 900
      }
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Logout user and clear cookies' })
  async logout(
    @Req() req: Request & { user?: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user?.sub);

    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';
    const sameSiteFlag = isProduction ? '; SameSite=None' : '; SameSite=Lax';

    // Clear cookies
    res.setHeader('Set-Cookie', [
      `access_token=; HttpOnly; Path=/; Max-Age=0${sameSiteFlag}${secureFlag}`,
      `refresh_token=; HttpOnly; Path=/; Max-Age=0${sameSiteFlag}${secureFlag}`
    ]);

    return { message: 'Logged out successfully' };
  }

  // ================= GOOGLE =================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin() {
    // Passport will handle the redirect
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback endpoint' })
  async googleCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } = req.user;

    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';
    const sameSiteFlag = isProduction ? '; SameSite=None' : '; SameSite=Lax';

    const accessTokenCookie = `access_token=${access_token}; HttpOnly; Path=/; Max-Age=900${sameSiteFlag}${secureFlag}`;
    const refreshTokenCookie = `refresh_token=${refresh_token}; HttpOnly; Path=/; Max-Age=604800${sameSiteFlag}${secureFlag}`;

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

    return { message: 'Google login successful', user };
  }

  // ================= FACEBOOK =================
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  async facebookLogin() {
    // Passport will handle the redirect
  }

  @Get('facebook/redirect')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback endpoint' })
  async facebookCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } = req.user;

    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';
    const sameSiteFlag = isProduction ? '; SameSite=None' : '; SameSite=Lax';

    const accessTokenCookie = `access_token=${access_token}; HttpOnly; Path=/; Max-Age=900${sameSiteFlag}${secureFlag}`;
    const refreshTokenCookie = `refresh_token=${refresh_token}; HttpOnly; Path=/; Max-Age=604800${sameSiteFlag}${secureFlag}`;

    res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

    return { message: 'Facebook login successful', user };
  }
}
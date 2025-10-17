import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Req,
  Res,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

interface JwtPayload {
  sub: string;
  role: string;
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // only true in prod
  sameSite: 'lax' as const,
};

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
    const { access_token, refresh_token, user, academy } =
      await this.authService.generateToken(dbUser);

    res.cookie('access_token', access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Login successful', user, academy, tokens: {
        access_token,
        refresh_token,
      }
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  async refresh(
    @Req() req: Request & { user?: JwtPayload },
    @Res({ passthrough: true }) res: Response,
    @Query('token') refreshTokenFromBody: string,
  ) {
    const refreshToken = req.cookies?.['refresh_token'] || refreshTokenFromBody;

    if (!refreshToken) {
      throw new BadRequestException('No refresh token found');
    }

    const { access_token, refresh_token, user } =
      await this.authService.refreshTokenNormal(refreshToken);

    res.cookie('access_token', access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Token refreshed', user, tokens: {
        access_token,
        refresh_token,
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

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If an account exists, a reset link was sent to the provided email.',
    schema: {
      example: {
        message: 'If an account exists, a reset link was sent.',
      },
    },
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email must be provided.');
    await this.authService.sendPasswordResetEmail(email);
    return { message: 'If an account exists, a reset link was sent.' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully.',
    schema: {
      example: {
        message: 'Password has been reset successfully.',
      },
    },
  })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const { token, newPassword } = body;
    if (!token || !newPassword)
      throw new BadRequestException('Token and new password are required.');
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password has been reset successfully.' };
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

    res.cookie('access_token', access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

    res.cookie('access_token', access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Facebook login successful', user };
  }
}

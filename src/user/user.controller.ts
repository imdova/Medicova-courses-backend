import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  Res,
  Req,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { AuthService } from 'src/auth/auth.service';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UpdateSecuritySettingsDto } from './dto/security-settings.dto';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { EmailService } from '../common/email.service';
import { cookieOptions } from '../auth/auth.controller';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) { }

  // Helper method for cookie options (same as auth controller logic)
  private getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with email, password, and role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error in the request body.',
  })
  @ApiBody({
    description: 'Data required to register a user',
    type: CreateUserDto,
  })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    let createdUser: User;

    if (createUserDto.academy) {
      // If instructor is creating an academy
      createdUser = await this.userService.registerWithAcademy(createUserDto);
    } else {
      createdUser = await this.userService.register(createUserDto);
    }

    // Send verification email
    await this.emailService.sendEmail({
      from: process.env.SMTP_DEMO_EMAIL,
      to: createdUser.email,
      subject: 'Please verify your email',
      template: 'verify-email', // 👈 .hbs file
      context: {
        name: createdUser.profile?.firstName || createdUser.email,
        verificationUrl: `https://courses.medicova.net/verify-email?token=${createdUser.emailVerificationToken}`,
      },
    });

    const { access_token, refresh_token, user } =
      await this.authService.generateToken(createdUser);

    res.cookie('access_token', access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Registration successful',
      user,
      // Return tokens for cross-origin requests (same as login)
      tokens: {
        access_token,
        refresh_token,
      }
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend your own verification email',
    description: 'Allows a logged-in user to resend the email verification link to themselves.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email resent successfully.',
  })
  async resendOwnVerification(@Req() req) {
    const user = await this.userService.resendVerificationEmail(req.user.sub);

    await this.emailService.sendEmail({
      from: process.env.SMTP_DEMO_EMAIL,
      to: user.email,
      subject: 'Please verify your email',
      template: 'verify-email',
      context: {
        name: user.profile?.firstName || user.email,
        verificationUrl: `https://courses.medicova.net/verify-email?token=${user.emailVerificationToken}`,
      },
    });

    return { message: 'Verification email resent successfully' };
  }


  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    const user = await this.userService.verifyEmail(token);
    return { message: 'Email verified successfully', user };
  }


  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:list')
  @Get()
  @ApiOperation({
    summary: 'List all users',
    description: 'Retrieves all registered users. Admin only.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all users.',
  })
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:get')
  @Get(':userId')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Fetch a single user by its UUID. Admin only.',
  })
  @ApiParam({ name: 'userId', type: String, description: 'UUID of the user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  findOne(@Param('userId') userId: string) {
    return this.userService.findOne(userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:update')
  @Patch(':userId')
  @ApiOperation({
    summary: 'Update user by ID',
    description: 'Updates details of an existing user. Admin only.',
  })
  @ApiParam({ name: 'userId', type: String, description: 'UUID of the user' })
  @ApiBody({ description: 'User update data', type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully.',
  })
  update(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(userId, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:delete')
  @Delete(':userId')
  @ApiOperation({
    summary: 'Delete user by ID',
    description: 'Removes a user from the system. Admin only.',
  })
  @ApiParam({ name: 'userId', type: String, description: 'UUID of the user' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User deleted successfully.',
  })
  remove(@Param('userId') userId: string) {
    return this.userService.remove(userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('student:list_for_instructor')
  @Get(':userId/students')
  @ApiOperation({
    summary: 'Get all students for an instructor',
    description:
      'Fetch all students enrolled in courses created by the given instructor.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'UUID of the instructor',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: `List of students enrolled in instructor's courses.`,
  })
  async getStudentsForInstructor(
    @Paginate() query: PaginateQuery,
    @Param('userId') instructorId: string,
    @Req() req,
  ): Promise<Paginated<any>> {
    if (req.user.role === 'instructor') {
      if (req.user.sub !== instructorId) {
        throw new ForbiddenException(
          'You are not allowed to view students for this user',
        );
      }
    }
    return this.userService.findStudentsByInstructor(query, instructorId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('account/update/security-settings')
  @ApiOperation({
    summary: 'Update security settings details',
    description:
      'Allows the logged-in user to update their email, phone number (from profile), and password.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account Security Settings updated successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or incorrect current password.',
  })
  async updateAccount(@Req() req, @Body() dto: UpdateSecuritySettingsDto) {
    return this.userService.updateSecuritySettings(req.user.sub, dto);
  }
}
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
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from './entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { cookieOptions } from '../auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { Response } from 'express';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

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
    if (!createUserDto.email) {
      throw new Error('Email must be provided.');
    }
    const createdUser = await this.userService.register(createUserDto);

    // Now generate token using properly injected AuthService
    const { access_token, refresh_token, user } =
      await this.authService.generateToken(createdUser);

    res.cookie('access_token', access_token, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Registration successful', user };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
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

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset token to the user’s email.',
  })
  @ApiBody({
    description: 'Email to send reset token to',
    type: ForgotPasswordDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent successfully.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.userService.forgotPassword(dto.email);
  }

  @Post('verify-reset-token')
  @ApiOperation({
    summary: 'Verify password reset token',
    description: 'Checks if a password reset token is valid and not expired.',
  })
  @ApiBody({ description: 'Token to verify', type: VerifyResetTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired token.',
  })
  verifyResetToken(@Body() dto: VerifyResetTokenDto) {
    return this.userService.verifyResetToken(dto.token);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets a user’s password using a valid reset token.',
  })
  @ApiBody({
    description: 'Token and new password data',
    type: ResetPasswordDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(dto);
  }
}

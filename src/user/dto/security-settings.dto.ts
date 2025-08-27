import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSecuritySettingsDto {
  @ApiProperty({ example: 'newemail@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'currentPassword123', required: false })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'newPassword123', required: false, minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;

  @ApiProperty({ example: 'newPassword123', required: false, minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  confirmNewPassword?: string;
}

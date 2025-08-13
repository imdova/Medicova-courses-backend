import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: '3f8e7c2a-4a9c-4a0e-bc6b-d3c4d2b4f1a1',
    description: 'Password reset token sent to the user via email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'The new password to set (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Confirmation of the new password (must match newPassword)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

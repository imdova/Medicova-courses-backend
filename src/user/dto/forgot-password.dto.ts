import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address associated with the user account',
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email' })
  email?: string;
}

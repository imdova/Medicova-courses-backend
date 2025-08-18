// src/auth/dto/login.dto.ts
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuthDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({ description: 'User password', example: 'strongPassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

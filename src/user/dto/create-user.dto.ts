import {
  IsOptional,
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Unique email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password of the user (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.STUDENT,
    description:
      'Role of the user in the system. If not provided, defaults to "student".',
  })
  @IsEnum(UserRole)
  @IsOptional() // optional so default can apply in entity
  role?: UserRole;
}

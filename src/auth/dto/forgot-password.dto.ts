import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'The email address of the user requesting a password reset',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

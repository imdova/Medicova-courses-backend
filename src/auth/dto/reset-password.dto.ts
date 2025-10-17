import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({
        example: 'c3b89f52-87cc-4a3d-bbc7-0a1234567890',
        description: 'The unique password reset token sent to the user’s email',
    })
    @IsNotEmpty()
    token: string;

    @ApiProperty({
        example: 'NewStrongPassword123!',
        description: 'The new password for the user account',
    })
    @IsNotEmpty()
    @MinLength(8)
    newPassword: string;
}

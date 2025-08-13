import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyResetTokenDto {
  @ApiProperty({
    example: '3f8e7c2a-4a9c-4a0e-bc6b-d3c4d2b4f1a1',
    description: 'Password reset token sent to the user via email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectIdentityDto {
    @ApiProperty({ description: 'The reason for rejecting the identity verification submission.' })
    @IsNotEmpty()
    @IsString()
    rejectionReason: string;
}
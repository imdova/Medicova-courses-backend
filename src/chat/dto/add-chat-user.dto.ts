import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class AddUserDto {
  @ApiProperty({
    description: 'User ID to add to chat',
    example: 'uuid-of-user',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Whether the user is admin', default: false })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean = false;
}

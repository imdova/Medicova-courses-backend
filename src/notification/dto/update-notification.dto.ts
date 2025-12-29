import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @ApiProperty({
    description: 'Mark notification as read',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiProperty({
    description: 'Mark notification as archived',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}


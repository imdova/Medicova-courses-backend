import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (text)',
    example: 'Hello team!',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Attachment URL (image, video, pdf, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

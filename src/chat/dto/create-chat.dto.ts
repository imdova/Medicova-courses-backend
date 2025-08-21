import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    description: 'Chat name (optional for 1-1 chats)',
    example: 'Math Group Chat',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'List of user IDs to add as participants',
    example: ['uuid-of-user1', 'uuid-of-user2'],
  })
  @IsArray()
  participants: string[];
}

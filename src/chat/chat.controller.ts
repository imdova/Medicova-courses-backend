import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AddUserDto } from './dto/add-chat-user.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Chats')
@Controller('chats')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat (group or 1-1)' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  createChat(@Body() dto: CreateChatDto) {
    return this.chatService.createChat(dto);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Add user to chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  addUser(@Param('id') chatId: string, @Body() dto: AddUserDto) {
    return this.chatService.addUser(chatId, dto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  sendMessage(
    @Param('id') chatId: string,
    @Body() dto: SendMessageDto,
    @Req() req,
  ) {
    return this.chatService.sendMessage(chatId, dto, req.user.sub);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages from a chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  getMessages(@Param('id') chatId: string) {
    return this.chatService.getMessages(chatId);
  }

  // User leaves chat
  @Delete(':chatId/leave')
  @ApiOperation({ summary: 'Leave a chat' })
  @ApiParam({ name: 'chatId', type: String, description: 'ID of the chat' })
  @ApiResponse({ status: 200, description: 'User left the chat successfully' })
  @ApiResponse({
    status: 404,
    description: 'Chat not found or user not part of chat',
  })
  async leaveChat(@Param('chatId') chatId: string, @Req() req) {
    const userId = req.user.sub;
    return this.chatService.leaveChat(chatId, userId);
  }

  // Admin removes participant
  @Delete(':chatId/users/:userId')
  @ApiOperation({ summary: 'Remove a participant from chat (admin only)' })
  @ApiParam({ name: 'chatId', type: String, description: 'ID of the chat' })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'ID of the participant to remove',
  })
  @ApiResponse({
    status: 200,
    description: 'User removed from chat successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can remove participants',
  })
  @ApiResponse({ status: 404, description: 'Chat or user not found' })
  async removeParticipant(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
    @Req() req,
  ) {
    const adminId = req.user.sub;
    return this.chatService.removeParticipant(chatId, userId, adminId);
  }
}

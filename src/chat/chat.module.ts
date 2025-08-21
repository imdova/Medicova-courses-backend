import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Chat } from './entities/chat.entity';
import { ChatUser } from './entities/chat-user.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatUser, ChatMessage, User])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // 👈 useful if other modules need chat functions
})
export class ChatModule {}

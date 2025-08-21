import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { ChatUser } from './entities/chat-user.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { AddUserDto } from './dto/add-chat-user.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatUser)
    private readonly chatUserRepo: Repository<ChatUser>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async createChat(dto: CreateChatDto) {
    const chat = await this.chatRepo.save(
      this.chatRepo.create({ name: dto.name }),
    );

    // Load all users in one query
    const users = await this.userRepo.find({
      where: { id: In(dto.participants) },
    });

    const chatUsers = users.map((user) =>
      this.chatUserRepo.create({ chat, user, isAdmin: false }),
    );
    await this.chatUserRepo.save(chatUsers);

    return {
      id: chat.id,
      name: chat.name,
      participants: users.map((u) => u.id),
    };
  }

  async addUser(chatId: string, dto: AddUserDto) {
    const chat = await this.chatRepo.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const chatUser = await this.chatUserRepo.save(
      this.chatUserRepo.create({
        chat,
        user,
        isAdmin: dto.isAdmin ?? false,
      }),
    );

    return { chatId: chat.id, userId: user.id, isAdmin: chatUser.isAdmin };
  }

  async sendMessage(chatId: string, dto: SendMessageDto, senderId: string) {
    // Only check existence instead of loading full entities
    const chatExists = await this.chatRepo.exists({ where: { id: chatId } });
    if (!chatExists) throw new NotFoundException('Chat not found');

    const senderExists = await this.userRepo.exists({
      where: { id: senderId },
    });
    if (!senderExists) throw new NotFoundException('Sender not found');

    const saved = await this.chatMessageRepo.save(
      this.chatMessageRepo.create({
        chat: { id: chatId } as Chat,
        sender: { id: senderId } as User,
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
      }),
    );

    return {
      id: saved.id,
      content: saved.content,
      attachmentUrl: saved.attachmentUrl,
      createdAt: saved.created_at,
      senderId,
    };
  }

  async getMessages(chatId: string) {
    const exists = await this.chatRepo.exists({ where: { id: chatId } });
    if (!exists) throw new NotFoundException('Chat not found');

    const messages = await this.chatMessageRepo.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { created_at: 'ASC' },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.created_at,
      senderId: m.sender.id,
    }));
  }

  // User leaves chat
  async leaveChat(chatId: string, userId: string) {
    const chatUser = await this.chatUserRepo.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    });
    if (!chatUser) throw new NotFoundException('You are not part of this chat');

    await this.chatUserRepo.delete(chatUser.id);
    return { chatId, userId, message: 'You left the chat' };
  }

  // Admin removes participant
  async removeParticipant(chatId: string, userId: string, adminId: string) {
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['participants', 'participants.user'],
    });
    if (!chat) throw new NotFoundException('Chat not found');

    const participant = chat.participants.find((p) => p.user.id === userId);
    if (!participant)
      throw new NotFoundException('User is not part of this chat');

    const admin = chat.participants.find((p) => p.user.id === adminId);
    if (!admin || !admin.isAdmin)
      throw new ForbiddenException('Only admins can remove participants');

    await this.chatUserRepo.delete(participant.id);
    return { chatId, userId, message: 'User removed from chat by admin' };
  }
}

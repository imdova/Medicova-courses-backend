import { BasicEntity } from '../../common/entities/basic.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ChatUser } from './chat-user.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chats')
export class Chat extends BasicEntity {
  @Column()
  name: string; // optional, useful for group chats

  @OneToMany(() => ChatUser, (chatUser) => chatUser.chat)
  participants: ChatUser[];

  @OneToMany(() => ChatMessage, (message) => message.chat)
  messages: ChatMessage[];
}

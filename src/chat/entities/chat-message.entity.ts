import { Column, Entity, ManyToOne } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Chat } from './chat.entity';
import { User } from '../../user/entities/user.entity';

@Entity('chat_message')
export class ChatMessage extends BasicEntity {
  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat: Chat;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  sender: User;

  @Column('text', { nullable: true })
  content?: string; // message text (optional if only attachment)

  @Column({ nullable: true })
  attachmentUrl?: string; // ✅ URL of uploaded file (image, video, pdf, etc.)
}

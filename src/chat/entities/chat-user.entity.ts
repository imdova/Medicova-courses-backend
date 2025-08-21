import { Column, Entity, ManyToOne } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Chat } from './chat.entity';
import { User } from '../../user/entities/user.entity';

@Entity('chat_user')
export class ChatUser extends BasicEntity {
  @ManyToOne(() => Chat, (chat) => chat.participants, { onDelete: 'CASCADE' })
  chat: Chat;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column({ default: false })
  isAdmin: boolean;
}

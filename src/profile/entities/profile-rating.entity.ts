import { BasicEntity } from 'src/common/entities/basic.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Profile } from 'src/profile/entities/profile.entity';
import { User } from 'src/user/entities/user.entity';

@Entity('profile_ratings')
@Unique(['profile', 'user']) // a user can only rate an instructor once
export class ProfileRating extends BasicEntity {
    @Column({ type: 'int' })
    rating: number; // 1–5

    @Column({ type: 'text', nullable: true })
    review?: string;

    @ManyToOne(() => Profile, (profile) => profile.ratings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'profile_id' })
    profile: Profile; // link directly to instructor profile

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}

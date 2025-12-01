import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';
import { Academy } from 'src/academy/entities/academy.entity';

@Entity()
export class Department extends BasicEntity {
    @ApiProperty({
        description: 'Name of the department',
        example: 'Marketing',
    })
    @Column({ unique: true })
    name: string;

    // Department belongs to an Instructor (if it's an instructor's department)
    @ApiProperty({
        description: 'User who created this department',
        type: () => User,
    })
    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    // Employees in this department
    @OneToMany(() => User, (user) => user.department)
    employees: User[];

}
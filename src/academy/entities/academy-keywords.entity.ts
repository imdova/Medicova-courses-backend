import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class AcademyKeyword extends BasicEntity {
    @ApiProperty({ description: 'Keyword name', example: 'Artificial Intelligence' })
    @Column({ unique: true })
    name: string;

    @ApiProperty({ description: 'Optional description for context', example: 'Academies focused on AI and ML' })
    @Column({ nullable: true })
    description?: string;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class BasicEntity {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'When the record was created',
    example: '2025-08-11T09:00:00.000Z',
  })
  @Index()
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    description: 'When the record was last updated',
    example: '2025-08-11T09:30:00.000Z',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    description: 'When the record was deleted (null if not deleted)',
    example: null,
    nullable: true,
  })
  @Index()
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deleted_at: Date | null;
}

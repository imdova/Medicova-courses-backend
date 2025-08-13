import { BasicEntity } from 'src/common/entities/basic.entity';
import { Entity, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('lectures')
export class Lecture extends BasicEntity {
  // @ApiProperty({
  //   description: 'ID of the user who created this lecture',
  //   format: 'uuid',
  // })
  // @Column({ type: 'uuid' })
  // createdBy: string;

  @ApiPropertyOptional({
    description: 'Optional lecture description',
    example: 'This lecture covers the basics of NestJS.',
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'URL of the lecture video',
    example: 'https://example.com/video.mp4',
  })
  @Column({ type: 'varchar', length: 255 })
  videoUrl: string;

  @ApiProperty({
    description: 'Title of the lecture',
    example: 'Introduction to NestJS',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional({
    description: 'URL of any additional materials (PDF, Word, etc.)',
    example: '/uploads/materials/lecture1.pdf',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  materialUrl?: string;

  @ApiProperty({ description: 'Whether the lecture is free', example: false })
  @Column({ type: 'boolean', default: false })
  isLectureFree: boolean;
}

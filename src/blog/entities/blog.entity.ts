import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    Column,
    Entity,
    Index,
} from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';

@Entity()
export class Blog extends BasicEntity {
    @ApiProperty({
        description: 'Internal name of the blog',
        example: 'ai-developments-2025',
    })
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @ApiProperty({
        description: 'Display title of the blog post',
        example: 'Top AI Developments to Watch in 2025',
    })
    @Column({ type: 'varchar', length: 512 })
    title: string;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'AI Trends 2025 | Blog',
    })
    @Column({
        type: 'varchar',
        length: 512,
        nullable: true,
        default: null,
    })
    metaTitle?: string;

    @ApiProperty({
        description:
            'Main content body of the blog (text only)',
        example:
            'This blog explores emerging AI technologies...',
    })
    @Column({ type: 'text' })
    description: string;

    @ApiPropertyOptional({
        description: 'Meta description for SEO',
        example: 'Read about upcoming AI trends in 2025...',
    })
    @Column({ type: 'text', nullable: true, default: null })
    metaDescription?: string;

    @ApiProperty({
        description: 'Unique slug used in blog URL',
        example: 'ai-developments-2025',
    })
    @Column({ type: 'varchar', length: 255, unique: true })
    @Index({ unique: true })
    slug: string;

    @ApiPropertyOptional({
        description: 'Image URL of the blog cover photo',
        example: 'https://cdn.example.com/images/ai.jpg',
    })
    @Column({
        type: 'varchar',
        length: 1024,
        nullable: true,
        default: null,
    })
    photo?: string;

    @ApiPropertyOptional({
        description: 'Comma-separated keywords for SEO',
        example: 'AI, Machine Learning, Future, 2025',
    })
    @Column({ type: 'text', nullable: true, default: null })
    keywords?: string;

    @ApiProperty({
        description: 'Whether the blog is active/published',
        default: true,
    })
    @Column({ type: 'boolean', default: true })
    isActive?: boolean;

    @ApiProperty({
        description: 'Whether the blog is a draft',
        default: false,
    })
    @Column({ type: 'boolean', default: false })
    isDraft?: boolean;

    @ApiProperty({
        description: 'Whether this blog is a reusable template',
        default: false,
    })
    @Column({ type: 'boolean', default: false })
    isTemplate?: boolean;

    @ApiProperty({
        description: 'Total view count for the blog',
        example: 123,
    })
    @Column({ type: 'int', default: 0 })
    views?: number;

    @ApiProperty({
        description:
            'Structured content of the blog (rich JSON format)',
        example: {
            blocks: [
                {
                    type: 'header',
                    data: { text: 'Intro to AI', level: 2 },
                },
                {
                    type: 'paragraph',
                    data: { text: 'AI is transforming...' },
                },
            ],
        },
    })
    @Column({ type: 'jsonb' })
    content: Record<string, any>;
}

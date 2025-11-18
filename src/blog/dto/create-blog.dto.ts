import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsObject, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateBlogDto {
    @ApiProperty({
        description: 'Internal name of the blog',
        example: 'ai-developments-2025',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Display title of the blog post',
        example: 'Top AI Developments to Watch in 2025',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    title: string;

    @ApiPropertyOptional({
        description: 'Meta title for SEO',
        example: 'AI Trends 2025 | Blog',
    })
    @IsString()
    @IsOptional()
    @MaxLength(512)
    metaTitle?: string;

    @ApiProperty({
        description: 'Main content body of the blog (text only)',
        example: 'This blog explores emerging AI technologies...',
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional({
        description: 'Meta description for SEO',
        example: 'Read about upcoming AI trends in 2025...',
    })
    @IsString()
    @IsOptional()
    metaDescription?: string;

    @ApiProperty({
        description: 'Unique slug used in blog URL',
        example: 'ai-developments-2025',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    slug: string;

    @ApiPropertyOptional({
        description: 'Image URL of the blog cover photo',
        example: 'https://cdn.example.com/images/ai.jpg',
    })
    @IsUrl()
    @IsOptional()
    @MaxLength(1024)
    photo?: string;

    @ApiPropertyOptional({
        description: 'Comma-separated keywords for SEO',
        example: 'AI, Machine Learning, Future, 2025',
    })
    @IsString()
    @IsOptional()
    keywords?: string;

    @ApiProperty({
        description: 'Whether the blog is active/published',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({
        description: 'Whether the blog is a draft',
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isDraft?: boolean;

    @ApiProperty({
        description: 'Whether this blog is a reusable template',
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isTemplate?: boolean;

    @ApiProperty({
        description: 'Total view count for the blog',
        example: 123,
        default: 0,
    })
    @IsNumber()
    @IsOptional()
    views?: number;

    @ApiProperty({
        description: 'Structured content of the blog (rich JSON format)',
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
    @IsObject()
    @IsNotEmpty()
    content: Record<string, any>;
}
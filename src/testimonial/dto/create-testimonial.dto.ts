import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from "class-validator";
import { TestimonialStatus } from "../entities/testimonial.entity";

export class CreateTestimonialDto {
    // ------------------- Titles -------------------

    @ApiProperty({
        description: 'Testimonial title in English',
        example: 'A highly recommended course!'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    titleEn: string;

    @ApiPropertyOptional({
        description: 'Testimonial title in Arabic',
        example: 'دورة موصى بها بشدة' // Arabic example
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    titleAr?: string;

    // ----------------- Descriptions -----------------

    @ApiPropertyOptional({
        description: 'Testimonial description in English',
        example: 'I found the content very engaging and the instructor was great.'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descriptionEn?: string;

    @ApiPropertyOptional({
        description: 'Testimonial description in Arabic',
        example: 'لقد وجدت المحتوى جذابًا جدًا وكان المدرب رائعًا.'
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descriptionAr?: string;

    // ------------------- Content (Rich Text/HTML) -------------------

    @ApiPropertyOptional({
        description: 'Testimonial content in English (Rich Text/HTML)',
        example: '<div>This course changed my career path. The deep dives into NestJS were invaluable.</div>'
    })
    @IsOptional()
    @IsString()
    contentEn?: string;

    @ApiPropertyOptional({
        description: 'Testimonial content in Arabic (Rich Text/HTML)',
        example: '<div>هذه الدورة غيرت مساري المهني. كانت المعلومات التفصيلية حول NestJS لا تقدر بثمن.</div>'
    })
    @IsOptional()
    @IsString()
    contentAr?: string;

    @ApiProperty({
        description: 'The publishing status.',
        enum: TestimonialStatus,
        // Typically DRAFT when created by a user, or omitted entirely.
        example: TestimonialStatus.DRAFT
    })
    @IsEnum(TestimonialStatus)
    status?: TestimonialStatus;
}
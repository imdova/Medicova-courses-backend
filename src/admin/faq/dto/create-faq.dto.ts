import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FaqCategory, FaqStatus } from "../entities/faq.entity";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateFaqDto {
    @ApiPropertyOptional({
        enum: FaqCategory,
        description: 'The category the FAQ belongs to.',
        example: FaqCategory.SHIPPING,
    })
    @IsNotEmpty()
    @IsEnum(FaqCategory)
    category: FaqCategory;

    // QUESTION - EN
    @ApiPropertyOptional({ description: 'Question text in English', example: 'What is the refund policy?' })
    @IsOptional()
    @IsString()
    questionEn: string;

    // QUESTION - AR
    @ApiPropertyOptional({ description: 'Question text in Arabic', example: 'ما هي سياسة استرداد الرسوم؟' })
    @IsOptional()
    @IsString()
    questionAr?: string;

    // ANSWER - EN (Rich Text)
    @ApiPropertyOptional({ description: 'Answer content in English (Rich Text/HTML)', example: 'Our policy allows refunds for up to 7 days...' })
    @IsOptional()
    @IsString()
    answerEn: string;

    // ANSWER - AR (Rich Text)
    @ApiPropertyOptional({ description: 'Answer content in Arabic (Rich Text/HTML)', example: 'تسمح سياستنا باسترداد الرسوم لمدة تصل إلى 7 أيام...' })
    @IsOptional()
    @IsString()
    answerAr?: string;

    // STATUS
    @ApiProperty({
        enum: FaqStatus,
        description: 'Publishing status of the FAQ.',
        default: FaqStatus.DRAFT,
    })
    @IsNotEmpty()
    @IsEnum(FaqStatus)
    status: FaqStatus;
}

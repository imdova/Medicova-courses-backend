import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, Length, IsInt, Min } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Research Paper on Climate Change' })
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    example: '2025-08-01T09:00:00Z', // ✅ ISO 8601 with time
    description: 'Start date and time of assignment',
    format: 'date-time',
  })
  @IsDateString()
  start_date: Date;

  @ApiProperty({
    example: '2025-08-31T23:59:59Z', // ✅ ISO 8601 with time
    description: 'End date and time of assignment',
    format: 'date-time',
  })
  @IsDateString()
  end_date: Date;

  @ApiProperty({
    example: 'Write a 10-page research paper on climate change impacts.',
  })
  @IsString()
  instructions: string;

  //   @ApiProperty({ example: '0-100' })
  //   @IsString()
  //   grading_scale: string;

  @ApiPropertyOptional({
    example: 'https://s3.aws.com/uploads/assignment.pdf',
  })
  @IsOptional()
  @IsString()
  attachment_url?: string;

  @ApiProperty({
    description: 'Total points available for this assignment',
    example: 100,
  })
  @IsInt()
  @Min(0)
  totalPoints: number;

  @ApiProperty({
    description: 'Number of questions in the assignment',
    example: 10,
  })
  @IsInt()
  @Min(0)
  numberOfQuestions: number;
}

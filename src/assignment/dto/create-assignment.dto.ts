import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, Length } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Research Paper on Climate Change' })
  @IsString()
  @Length(3, 255)
  name: string;

  @ApiProperty({ example: '2025-08-01' })
  @IsDateString()
  start_date: Date;

  @ApiProperty({ example: '2025-08-31' })
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
}

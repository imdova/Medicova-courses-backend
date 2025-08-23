import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitAssignmentDto {
  @ApiPropertyOptional({
    description: 'Optional notes or description for the submission',
    example: 'Here is my essay submission.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'URL of the uploaded assignment file (PDF, DOC, etc.)',
    example: '/uploads/my-assignment.pdf',
  })
  @IsString()
  file_url?: string;
}

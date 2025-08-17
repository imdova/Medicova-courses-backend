import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseSectionDto {
  @ApiProperty({ description: 'Name of the section', example: 'Introduction' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the section',
    example: 'Overview of the course',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Order of the section in the course',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  order: number;
}

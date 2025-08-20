import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateAcademyDto {
  @ApiProperty({
    description: 'Name of the academy',
    example: 'Bright Future Academy',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Short description of the academy',
    example: 'A leading academy for online courses',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

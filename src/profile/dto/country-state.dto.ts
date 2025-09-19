import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CountryOrStateDTO {
    @ApiProperty({ example: 'Egypt', description: 'Name of the country or state' })
    @IsString()
    name: string;

    @ApiProperty({
        example: 'EG',
        description: 'ISO code of the country or state (if applicable)',
    })
    @IsOptional()
    @IsString()
    code?: string;
}

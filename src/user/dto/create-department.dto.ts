import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDepartmentDto {
    @ApiProperty({
        description: 'Name of the department',
        example: 'Marketing',
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}
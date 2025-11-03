import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from '../../../common/entities/basic.entity'; // Assuming BasicEntity exists

// 🟢 Define the possible variable types based on the UI
export enum CourseVariableType {
    COURSE_TYPE = 'Course Type',
    PROGRAM_TYPE = 'Program Type',
}

@Entity('course_variables')
export class CourseVariable extends BasicEntity {
    @ApiProperty({
        description: 'The type of variable being defined (e.g., Course Type, Program Type).',
        enum: CourseVariableType,
        example: CourseVariableType.COURSE_TYPE,
    })
    @Column({ type: 'enum', enum: CourseVariableType })
    type: CourseVariableType; // Variable Type *

    @ApiProperty({
        description: 'A numeric value determining the display order/priority of the variable.',
        example: 1,
    })
    @Column({ type: 'int' })
    priority: number; // Priority *

    @ApiProperty({
        description: 'The display name or label of the variable value (e.g., Recorded, Live, Master).',
        maxLength: 50,
        example: 'Recorded',
    })
    // This is the user-facing name, often auto-generated/editable
    @Column({ length: 50, unique: true, name: 'display_name' })
    displayName: string; // Display Name *

    @ApiProperty({
        description: 'The actual system/database value associated with the variable (e.g., recorded, live, hybrid).',
        maxLength: 50,
        example: 'recorded',
    })
    // This is the internal/system value, often auto-generated/editable
    @Column({ length: 50, unique: true })
    value: string; // Value *

    @ApiProperty({
        description: 'Whether the course variable is active and available for use.',
        default: true,
    })
    @Column({ type: 'boolean', default: true, name: 'isActive' })
    isActive: boolean; // Status (Active/Inactive)
}
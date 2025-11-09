import { Entity, Column, Index, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from '../../../common/entities/basic.entity'; // Assuming BasicEntity exists

// 🟢 Define the possible variable types based on the UI
export enum SettingType {
    NATIONALITY = 'Nationality',
    DEGREE = 'Degree',
    CATEGORY = 'Category',
    SPECIALIZATION = 'Specialization',
    LANGUAGE = 'Language',
    PROFICIENCY_LEVEL = 'Proficiency Level',
}

@Entity('academy_settings')
export class AcademySetting extends BasicEntity {
    @ApiProperty({
        description: 'The type of setting being defined (e.g., Course Type, Program Type).',
        enum: SettingType,
        example: SettingType.NATIONALITY,
    })
    @Column({ type: 'enum', enum: SettingType })
    type: SettingType; // Variable Type *

    @ApiProperty({
        description: 'A numeric value determining the display order/priority of the setting.',
        example: 1,
    })
    @Column({ type: 'int' })
    priority: number; // Priority *

    @ApiProperty({
        description: 'The display name or label of the setting value (e.g., Recorded, Live, Master).',
        maxLength: 50,
        example: 'Recorded',
    })
    // This is the user-facing name, often auto-generated/editable
    @Column({ length: 50, unique: true, name: 'display_name' })
    displayName: string; // Display Name *

    @ApiProperty({
        description: 'The actual system/database value associated with the setting (e.g., recorded, live, hybrid).',
        maxLength: 50,
        example: 'recorded',
    })
    // This is the internal/system value, often auto-generated/editable
    @Column({ length: 50, unique: true })
    value: string; // Value *

    @ApiProperty({
        description: 'Whether the course setting is active and available for use.',
        default: true,
    })
    @Column({ type: 'boolean', default: true, name: 'isActive' })
    isActive: boolean; // Status (Active/Inactive)

    // 🟢 NEW: Parent relationship for hierarchical settings
    @ApiProperty({
        description: 'Parent setting for hierarchical relationships',
        type: () => AcademySetting,
        required: false,
    })
    @ManyToOne(() => AcademySetting, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_id' })
    parent?: AcademySetting;

    @ApiProperty({
        description: 'ID of the parent setting',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
    parentId?: string;
}
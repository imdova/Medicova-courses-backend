import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CourseApprovalStatus } from '../entities/course.entity';

export class ApproveCourseDto {
    @ApiProperty({
        description: 'New approval status',
        enum: CourseApprovalStatus,
        example: CourseApprovalStatus.APPROVED,
    })
    @IsEnum(CourseApprovalStatus)
    status: CourseApprovalStatus;
}
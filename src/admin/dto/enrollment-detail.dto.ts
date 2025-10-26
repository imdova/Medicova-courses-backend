import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EnrollmentStatus {
  COMPLETED = 'completed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ALL = 'all',
}

export class EnrollmentDetailDto {
  @ApiProperty({ example: 'uuid-here' })
  enrollmentId: string;

  @ApiProperty({ example: 'John Doe' })
  studentName: string;

  @ApiProperty({ example: 'john@example.com' })
  studentEmail: string;

  @ApiProperty({ example: 'uuid-here' })
  courseId: string;

  @ApiProperty({ example: 'NestJS for Beginners' })
  courseName: string;

  @ApiProperty({ example: '2024-10-15T10:30:00Z' })
  enrollmentDate: string;

  @ApiProperty({ example: 'active', enum: EnrollmentStatus })
  status: string;

  @ApiProperty({ example: 65.5, description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ example: 'Dr. Mohamed Sayed' })
  instructorName: string;

  @ApiProperty({ example: 299.99, nullable: true })
  price: number | null;

  @ApiPropertyOptional({ example: 3 })
  completedItems?: number;

  @ApiPropertyOptional({ example: 10 })
  totalItems?: number;
}

export class EnrollmentsListResponseDto {
  @ApiProperty({ type: [EnrollmentDetailDto] })
  enrollments: EnrollmentDetailDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
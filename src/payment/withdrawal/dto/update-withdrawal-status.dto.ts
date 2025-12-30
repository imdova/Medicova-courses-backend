import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { WithdrawalStatus } from '../entities/withdrawal.entity';

export class UpdateWithdrawalStatusDto {
    @ApiProperty({ description: 'New status', enum: WithdrawalStatus })
    @IsEnum(WithdrawalStatus)
    status: WithdrawalStatus;

    @ApiProperty({ description: 'Reason for rejection (if rejected)', required: false })
    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @ApiProperty({ description: 'Processing notes', required: false })
    @IsOptional()
    @IsString()
    processingNotes?: string;

    @ApiProperty({ description: 'Gateway transaction ID', required: false })
    @IsOptional()
    @IsString()
    gatewayTransactionId?: string;

    @ApiProperty({ description: 'Gateway response', required: false })
    @IsOptional()
    @IsObject()
    gatewayResponse?: Record<string, any>;
}
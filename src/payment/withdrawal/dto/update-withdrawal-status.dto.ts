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
}
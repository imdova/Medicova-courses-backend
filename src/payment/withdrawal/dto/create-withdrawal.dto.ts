import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsObject, IsOptional, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDto {
    @ApiProperty({ description: 'Withdrawal method ID' })
    @IsString()
    withdrawalMethodId: string;

    @ApiProperty({ description: 'Withdrawal amount' })
    @IsNumber()
    @Min(100, { message: 'Minimum withdrawal amount is 100' })
    amount: number;

    @ApiProperty({
        description: 'Payment metadata (method-specific data)',
        example: {
            phoneNumber: '+201012345678',
            // or
            bankName: 'CIB',
            accountNumber: '123456789',
            accountHolderName: 'John Doe',
            // or
            email: 'creator@example.com',
        }
    })
    @IsObject()
    metadata: Record<string, any>;

    @ApiProperty({ description: 'Currency code', default: 'EGP' })
    @IsOptional()
    @IsString()
    currency?: string = 'EGP';
}
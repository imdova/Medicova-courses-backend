import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
    @ApiProperty({
        description: 'Provider transaction ID',
        example: 'txn_1234567890',
    })
    transactionId: string;

    @ApiProperty({
        description: 'Provider response data',
        example: {
            status: 'success',
            amount: 199.99,
            currency: 'USD',
            timestamp: '2024-01-15T10:30:00Z',
        },
    })
    providerResponse: any;
}
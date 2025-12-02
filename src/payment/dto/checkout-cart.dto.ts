// dto/checkout-cart.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CheckoutCartDto {
    @ApiProperty({
        description: 'Payment method',
        enum: PaymentMethod,
        example: PaymentMethod.CREDIT_CARD,
    })
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;
}
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The amount to be paid',
    example: 150.5,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  // @ApiProperty({
  //   description: 'Currency of the payment',
  //   enum: CurrencyCode,
  //   example: CurrencyCode.EGP,
  // })
  // @IsEnum(CurrencyCode)
  // currency: CurrencyCode;

  @ApiProperty({
    description: 'Payment method to use',
    enum: PaymentMethod,
    example: PaymentMethod.FAWRY,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

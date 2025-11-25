// cart-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartStatus } from '../entities/cart.entity';
import { CartItemResponseDto } from './cart-item-response.dto';

export class CartResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    createdBy: string;

    @ApiProperty({ enum: CartStatus })
    status: CartStatus;

    @ApiProperty({ example: 199.99 })
    totalPrice: number;

    @ApiProperty({ example: 'USD' })
    currencyCode: string;

    @ApiProperty({ example: 3 })
    itemsCount: number;

    @ApiProperty({ type: [CartItemResponseDto] })
    items: CartItemResponseDto[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
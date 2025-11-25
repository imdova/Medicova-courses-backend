// cart-item-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartItemType } from '../entities/cart-item.entity';

export class CartItemResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ enum: CartItemType })
    itemType: CartItemType;

    @ApiProperty({ format: 'uuid' })
    itemId: string;

    @ApiProperty({ example: 1 })
    quantity: number;

    @ApiProperty({ example: 99.99 })
    price: number;

    @ApiProperty({ example: 'USD' })
    currencyCode: string;

    @ApiProperty({ example: 'Advanced JavaScript Course' })
    itemTitle: string;

    @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
    thumbnailUrl?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
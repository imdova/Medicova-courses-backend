// create-cart-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { CartItemType } from '../entities/cart-item.entity';

export class CreateCartItemDto {
    @ApiProperty({
        description: 'Type of item to add to cart',
        enum: CartItemType
    })
    @IsEnum(CartItemType)
    itemType: CartItemType;

    @ApiProperty({
        description: 'ID of the course or bundle',
        format: 'uuid'
    })
    @IsUUID()
    itemId: string;

    @ApiProperty({
        description: 'Currency code for the item',
        enum: ['USD', 'EUR', 'EGP', 'SAR'],
        example: 'USD'
    })
    @IsString()
    currencyCode: string;

    @ApiProperty({
        description: 'Quantity of items',
        default: 1,
        minimum: 1
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number = 1;
}
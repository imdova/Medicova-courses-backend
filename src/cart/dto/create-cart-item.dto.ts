// create-cart-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsInt, Min, IsOptional } from 'class-validator';
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

    @ApiPropertyOptional({
        description: 'Quantity of items',
        default: 1,
        minimum: 1
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number = 1;
}
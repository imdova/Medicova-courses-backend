// cart.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import { CartService, EnhancedCartResponse } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { CartStatus } from './entities/cart.entity';

@ApiTags('Cart')
@ApiBearerAuth('access_token')
@Controller('cart')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async getCart(@Req() req): Promise<CartResponseDto> {
    const createdBy = req.user.sub;
    const cart = await this.cartService.getCart(createdBy); // This returns EnhancedCartResponse
    return this.mapSuperCartToDto(cart);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, type: CartResponseDto })
  async addItem(
    @Req() req,
    @Body() createCartItemDto: CreateCartItemDto,
  ): Promise<CartResponseDto> {
    const createdBy = req.user.sub;
    const cart = await this.cartService.addItemToCart(createdBy, createCartItemDto);
    return this.mapCartToDto(cart);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'UUID of the cart item' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateItem(
    @Req() req,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const createdBy = req.user.sub;
    const cart = await this.cartService.updateCartItem(createdBy, itemId, updateCartItemDto);
    return this.mapCartToDto(cart);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', description: 'UUID of the cart item' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(
    @Req() req,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<CartResponseDto> {
    const createdBy = req.user.sub;
    const cart = await this.cartService.removeItemFromCart(createdBy, itemId);
    return this.mapCartToDto(cart);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@Req() req): Promise<{ message: string }> {
    const createdBy = req.user.sub;
    await this.cartService.clearCart(createdBy);
    return { message: 'Cart cleared successfully' };
  }

  private mapCartToDto(cart: any): CartResponseDto {
    if (!cart) {
      return {
        id: null,
        createdBy: null,
        status: CartStatus.ACTIVE,
        totalPrice: 0,
        currencyCode: 'USD',
        itemsCount: 0,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: cart.id,
      createdBy: cart.createdBy,
      status: cart.status,
      totalPrice: cart.totalPrice,
      currencyCode: cart.currencyCode,
      itemsCount: cart.itemsCount,
      items: cart.items?.map(item => ({
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        quantity: item.quantity,
        price: item.price,
        currencyCode: item.currencyCode,
        itemTitle: item.itemTitle,
        thumbnailUrl: item.thumbnailUrl,
        // Add creator info if available
        creatorId: item.creatorId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) || [],
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private mapSuperCartToDto(cart: EnhancedCartResponse): CartResponseDto {
    if (!cart || !cart.id) {
      return {
        id: null,
        createdBy: null,
        status: CartStatus.ACTIVE,
        totalPrice: 0,
        currencyCode: 'USD',
        itemsCount: 0,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: cart.id,
      createdBy: cart.createdBy,
      status: cart.status,
      totalPrice: cart.totalPrice,
      currencyCode: cart.currencyCode,
      itemsCount: cart.itemsCount,
      items: cart.items.map(item => ({
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemType === 'course' ? item.courseId : item.bundleId,
        quantity: item.quantity,
        price: item.price,
        currencyCode: item.currencyCode,
        itemTitle: item.itemTitle,
        thumbnailUrl: item.thumbnailUrl,
        creatorId: item.creatorId, // Include creatorId
        // Add the enhanced details here
        courseDetails: item.courseDetails,
        bundleDetails: item.bundleDetails,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      createdAt: cart.created_at,
      updatedAt: cart.updated_at,
    };
  }
}
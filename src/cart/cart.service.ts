// cart.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem, CartItemType } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Course } from '../course/entities/course.entity';
import { Bundle } from '../bundle/entities/bundle.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Bundle)
    private bundleRepository: Repository<Bundle>,
    private dataSource: DataSource,
  ) { }

  async getOrCreateActiveCart(createdBy: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { createdBy, status: CartStatus.ACTIVE },
      relations: ['items', 'items.course', 'items.bundle'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        createdBy,
        status: CartStatus.ACTIVE,
        totalPrice: 0,
        itemsCount: 0,
        currencyCode: 'USD',
      });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  async addItemToCart(createdBy: string, createCartItemDto: CreateCartItemDto): Promise<Cart> {
    const { itemType, itemId, quantity = 1 } = createCartItemDto;

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Get or create active cart
      let cart = await transactionalEntityManager.findOne(Cart, {
        where: { createdBy, status: CartStatus.ACTIVE },
        relations: ['items'], // Load items to check for duplicates
      });

      if (!cart) {
        cart = transactionalEntityManager.create(Cart, {
          createdBy,
          status: CartStatus.ACTIVE,
          totalPrice: 0,
          itemsCount: 0,
          currencyCode: 'USD',
        });
        cart = await transactionalEntityManager.save(Cart, cart);
      }

      // Initialize items array if it's undefined
      if (!cart.items) {
        cart.items = [];
      }

      // Check if item already exists in cart - FIXED: Handle undefined items
      const existingItem = cart.items.find(item => {
        if (itemType === CartItemType.COURSE) {
          return item.itemType === itemType && item.courseId === itemId;
        } else {
          return item.itemType === itemType && item.bundleId === itemId;
        }
      });

      if (existingItem) {
        throw new ConflictException('Item already exists in cart');
      }

      // Get item details and pricing
      const { price, currencyCode, title, thumbnailUrl, courseId, bundleId } =
        await this.getItemDetails(itemType, itemId);

      // Create cart item with appropriate IDs
      const cartItemData: any = {
        cartId: cart.id,
        itemType,
        quantity,
        price,
        currencyCode,
        itemTitle: title,
        thumbnailUrl,
      };

      // Set the appropriate ID based on item type
      if (itemType === CartItemType.COURSE) {
        cartItemData.courseId = courseId;
      } else {
        cartItemData.bundleId = bundleId;
      }

      const cartItem = transactionalEntityManager.create(CartItem, cartItemData);
      await transactionalEntityManager.save(CartItem, cartItem);

      // Reload cart with all relations to get the complete cart
      const updatedCart = await transactionalEntityManager.findOne(Cart, {
        where: { id: cart.id },
        relations: ['items', 'items.course', 'items.bundle'],
      });

      // Calculate totals and save
      updatedCart.calculateTotals();
      await transactionalEntityManager.save(Cart, updatedCart);

      return updatedCart;
    });
  }

  async updateCartItem(createdBy: string, cartItemId: string, updateCartItemDto: UpdateCartItemDto): Promise<Cart> {
    const { quantity } = updateCartItemDto;

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const cart = await transactionalEntityManager.findOne(Cart, {
        where: { createdBy, status: CartStatus.ACTIVE },
        relations: ['items'],
      });

      if (!cart) {
        throw new NotFoundException('Active cart not found');
      }

      // Initialize items array if undefined
      if (!cart.items) {
        cart.items = [];
      }

      const cartItem = cart.items.find(item => item.id === cartItemId);
      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      cartItem.quantity = quantity;
      await transactionalEntityManager.save(CartItem, cartItem);

      // Reload cart and recalculate totals
      const updatedCart = await transactionalEntityManager.findOne(Cart, {
        where: { id: cart.id },
        relations: ['items', 'items.course', 'items.bundle'],
      });

      updatedCart.calculateTotals();
      await transactionalEntityManager.save(Cart, updatedCart);

      return updatedCart;
    });
  }

  async removeItemFromCart(createdBy: string, cartItemId: string): Promise<Cart> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const cart = await transactionalEntityManager.findOne(Cart, {
        where: { createdBy, status: CartStatus.ACTIVE },
        relations: ['items'],
      });

      if (!cart) {
        throw new NotFoundException('Active cart not found');
      }

      // Initialize items array if undefined
      if (!cart.items) {
        cart.items = [];
      }

      const cartItem = cart.items.find(item => item.id === cartItemId);
      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      await transactionalEntityManager.delete(CartItem, cartItemId);

      // Reload cart and recalculate totals
      const updatedCart = await transactionalEntityManager.findOne(Cart, {
        where: { id: cart.id },
        relations: ['items', 'items.course', 'items.bundle'],
      });

      if (!updatedCart || !updatedCart.items || updatedCart.items.length === 0) {
        // If no items left, delete the cart
        if (updatedCart) {
          await transactionalEntityManager.delete(Cart, cart.id);
        }
        return null;
      }

      updatedCart.calculateTotals();
      await transactionalEntityManager.save(Cart, updatedCart);

      return updatedCart;
    });
  }

  async clearCart(createdBy: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { createdBy, status: CartStatus.ACTIVE },
    });

    if (cart) {
      await this.cartItemRepository.delete({ cartId: cart.id });
      await this.cartRepository.delete(cart.id);
    }
  }

  async checkoutCart(createdBy: string): Promise<Cart> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const cart = await transactionalEntityManager.findOne(Cart, {
        where: { createdBy, status: CartStatus.ACTIVE },
        relations: ['items', 'items.course', 'items.bundle'],
      });

      if (!cart) {
        throw new NotFoundException('Active cart not found');
      }

      // Initialize items array if undefined
      if (!cart.items || cart.items.length === 0) {
        throw new ConflictException('Cannot checkout empty cart');
      }

      // Mark cart as completed
      cart.status = CartStatus.COMPLETED;
      await transactionalEntityManager.save(Cart, cart);

      // Here you would typically:
      // 1. Process payment
      // 2. Create orders
      // 3. Enroll users in courses/bundles
      // 4. Send confirmation emails, etc.

      return cart;
    });
  }

  async getCart(createdBy: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { createdBy, status: CartStatus.ACTIVE },
      relations: ['items', 'items.course', 'items.bundle'],
    });

    if (!cart) {
      // Return empty cart structure
      return this.cartRepository.create({
        createdBy,
        status: CartStatus.ACTIVE,
        totalPrice: 0,
        itemsCount: 0,
        currencyCode: 'USD',
        items: [],
      });
    }

    // Ensure items array is initialized
    if (!cart.items) {
      cart.items = [];
    }

    return cart;
  }

  private async getItemDetails(itemType: CartItemType, itemId: string): Promise<{
    price: number;
    currencyCode: string;
    title: string;
    thumbnailUrl?: string;
    courseId?: string;
    bundleId?: string;
  }> {
    if (itemType === CartItemType.COURSE) {
      const course = await this.courseRepository.findOne({
        where: { id: itemId },
        relations: ['pricings'],
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.isCourseFree) {
        return {
          price: 0,
          currencyCode: 'USD',
          title: course.name,
          thumbnailUrl: course.courseImage,
          courseId: itemId,
        };
      }

      // Get active pricing
      const activePricing = course.pricings?.find(pricing => pricing.isActive);
      if (!activePricing) {
        throw new NotFoundException('No active pricing found for course');
      }

      const price = activePricing.salePrice || activePricing.regularPrice;

      return {
        price,
        currencyCode: activePricing.currencyCode,
        title: course.name,
        thumbnailUrl: course.courseImage,
        courseId: itemId,
      };
    } else {
      const bundle = await this.bundleRepository.findOne({
        where: { id: itemId },
        relations: ['pricings'],
      });

      if (!bundle) {
        throw new NotFoundException('Bundle not found');
      }

      if (bundle.is_free) {
        return {
          price: 0,
          currencyCode: 'USD',
          title: bundle.title,
          thumbnailUrl: bundle.thumbnail_url,
          bundleId: itemId,
        };
      }

      // Get active pricing for bundle
      const activePricing = bundle.pricings?.find(pricing => pricing.is_active);
      if (!activePricing) {
        throw new NotFoundException('No active pricing found for bundle');
      }

      const price = activePricing.sale_price || activePricing.regular_price;

      return {
        price,
        currencyCode: activePricing.currency_code,
        title: bundle.title,
        thumbnailUrl: bundle.thumbnail_url,
        bundleId: itemId,
      };
    }
  }
}
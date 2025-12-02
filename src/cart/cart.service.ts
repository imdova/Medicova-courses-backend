// cart.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem, CartItemType } from './entities/cart-item.entity';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Course } from '../course/entities/course.entity';
import { Bundle } from '../bundle/entities/bundle.entity';
import { User } from 'src/user/entities/user.entity';

// Enhanced interfaces only for GET endpoint
interface EnhancedCartItem {
  id: string;
  cartId: string;
  itemType: CartItemType;
  courseId?: string;
  bundleId?: string;
  quantity: number;
  price: number;
  currencyCode: string;
  itemTitle: string;
  thumbnailUrl?: string;
  creatorId: string; // Add creatorId
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  courseDetails?: {
    id: string;
    name: string;
    slug: string;
    averageRating: number;
    instructor: {
      id: string;
      fullName: string;
      photoUrl?: string;
    };
    totalLessons: number;
    enrolledStudents: number;
    courseDuration?: number;
    courseDurationUnit?: string;
    type: string;
  };
  bundleDetails?: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    thumbnail_url?: string;
    creatorId: string; // Add creatorId for bundles
  };
}

export interface EnhancedCartResponse {
  id: string;
  createdBy: string;
  status: CartStatus;
  totalPrice: number;
  currencyCode: string;
  itemsCount: number;
  items: EnhancedCartItem[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) { }

  // Keep all other methods returning basic Cart (without enhanced details)
  async addItemToCart(createdBy: string, createCartItemDto: CreateCartItemDto): Promise<Cart> {
    const { itemType, itemId, currencyCode, quantity = 1 } = createCartItemDto;

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Get or create active cart
      let cart = await transactionalEntityManager.findOne(Cart, {
        where: { createdBy, status: CartStatus.ACTIVE },
        relations: ['items'],
      });

      if (!cart) {
        // First item - create cart with the specified currency
        cart = transactionalEntityManager.create(Cart, {
          createdBy,
          status: CartStatus.ACTIVE,
          totalPrice: 0,
          itemsCount: 0,
          currencyCode: currencyCode,
        });
        cart = await transactionalEntityManager.save(Cart, cart);
      } else {
        // Cart exists - validate currency consistency
        if (cart.currencyCode !== currencyCode) {
          throw new BadRequestException(
            `Cannot add item with currency ${currencyCode} to cart with currency ${cart.currencyCode}. All items in cart must use the same currency.`
          );
        }
      }

      // Initialize items array if it's undefined
      if (!cart.items) {
        cart.items = [];
      }

      // Check if item already exists in cart
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

      // Get item details and pricing for the specified currency, including creator
      const { price, title, thumbnailUrl, courseId, bundleId, creatorId } =
        await this.getItemDetails(itemType, itemId, currencyCode);

      // Create cart item with appropriate IDs and creator
      const cartItemData: any = {
        cartId: cart.id,
        itemType,
        quantity,
        price,
        currencyCode,
        itemTitle: title,
        thumbnailUrl,
        creatorId, // Add creatorId
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
        relations: ['items', 'items.course', 'items.bundle', 'items.creator'],
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
        relations: ['items', 'items.course', 'items.bundle', 'items.creator'],
      });

      updatedCart.calculateTotals();
      await transactionalEntityManager.save(Cart, updatedCart);

      return updatedCart;
    });
  }

  async removeItemFromCart(createdBy: string, cartItemId: string): Promise<Cart | null> {
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
        relations: ['items', 'items.course', 'items.bundle', 'items.creator'],
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

  // Removed checkoutCart method - it's now handled in payment controller

  // ONLY the getCart method returns enhanced details
  async getCart(createdBy: string): Promise<EnhancedCartResponse> {
    const cart = await this.cartRepository.findOne({
      where: { createdBy, status: CartStatus.ACTIVE },
      relations: ['items', 'items.course', 'items.bundle', 'items.creator'],
    });

    if (!cart) {
      // Return empty cart structure
      return {
        id: null,
        createdBy,
        status: CartStatus.ACTIVE,
        totalPrice: 0,
        currencyCode: 'USD',
        itemsCount: 0,
        items: [],
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
    }

    // Ensure items array is initialized
    if (!cart.items) {
      cart.items = [];
    }

    // Return enhanced cart with additional details (ONLY for GET endpoint)
    return await this.enhanceCartWithDetails(cart);
  }

  private async enhanceCartWithDetails(cart: Cart): Promise<EnhancedCartResponse> {
    const enhancedItems = await Promise.all(
      cart.items.map(async (item) => {
        // Create a plain object with only the data properties we need for response
        const enhancedItem: EnhancedCartItem = {
          id: item.id,
          cartId: item.cartId,
          itemType: item.itemType,
          courseId: item.courseId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          price: item.price,
          currencyCode: item.currencyCode,
          itemTitle: item.itemTitle,
          thumbnailUrl: item.thumbnailUrl,
          creatorId: item.creatorId, // Include creatorId
          created_at: item.created_at,
          updated_at: item.updated_at,
          deleted_at: item.deleted_at,
        };

        if (item.itemType === CartItemType.COURSE && item.courseId) {
          const courseDetails = await this.getEnhancedCourseDetails(item.courseId);
          enhancedItem.courseDetails = courseDetails;
        } else if (item.itemType === CartItemType.BUNDLE && item.bundleId) {
          const bundleDetails = await this.getBundleDetails(item.bundleId);
          enhancedItem.bundleDetails = bundleDetails;
        }

        return enhancedItem;
      })
    );

    return {
      id: cart.id,
      createdBy: cart.createdBy,
      status: cart.status,
      totalPrice: cart.totalPrice,
      currencyCode: cart.currencyCode,
      itemsCount: cart.itemsCount,
      items: enhancedItems,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
      deleted_at: cart.deleted_at,
    };
  }

  private async getEnhancedCourseDetails(courseId: string): Promise<any> {
    const course = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.instructor', 'instructor')
      .innerJoin('instructor.profile', 'profile')
      .leftJoin('course.enrollments', 'enrollments')
      .select([
        'course.id',
        'course.name',
        'course.slug',
        'course.averageRating',
        'course.totalHours',
        'course.courseDuration',
        'course.courseDurationUnit',
        'course.type'
      ])
      .addSelect('instructor.id', 'instructorId')
      .addSelect(
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
        'instructorFullName',
      )
      .addSelect('profile.photoUrl', 'instructorPhotoUrl')
      .addSelect('COUNT(DISTINCT enrollments.id)', 'enrolledStudents')
      .addSelect(`(
        SELECT COUNT(DISTINCT si.id) 
        FROM course_sections cs 
        LEFT JOIN course_section_items si ON cs.id = si.section_id 
        WHERE cs.course_id = course.id 
        AND si."curriculumType" = 'lecture'
      )`, 'totalLessons')
      .where('course.id = :courseId', { courseId })
      .groupBy('course.id')
      .addGroupBy('course.name')
      .addGroupBy('course.slug')
      .addGroupBy('course.averageRating')
      .addGroupBy('course.totalHours')
      .addGroupBy('course.courseDuration')
      .addGroupBy('course.courseDurationUnit')
      .addGroupBy('course.type')
      .addGroupBy('instructor.id')
      .addGroupBy('profile.firstName')
      .addGroupBy('profile.lastName')
      .addGroupBy('profile.photoUrl')
      .getRawOne();

    if (!course) {
      return null;
    }

    return {
      id: course.course_id,
      name: course.course_name,
      slug: course.course_slug,
      averageRating: parseFloat(course.course_average_rating) || 0,
      instructor: {
        id: course.instructorId,
        fullName: course.instructorFullName?.trim() || 'Unknown Instructor',
        photoUrl: course.instructorPhotoUrl,
      },
      totalLessons: parseInt(course.totalLessons, 10) || 0,
      enrolledStudents: parseInt(course.enrolledStudents, 10) || 0,
      courseDuration: course.course_courseDuration,
      courseDurationUnit: course.course_courseDurationUnit,
      type: course.course_type,
    };
  }

  private async getBundleDetails(bundleId: string): Promise<any> {
    const bundle = await this.bundleRepository.findOne({
      where: { id: bundleId },
      select: ['id', 'title', 'slug', 'description', 'thumbnail_url', 'created_by'],
      relations: ['creator'],
    });

    if (!bundle) {
      return null;
    }

    return {
      id: bundle.id,
      title: bundle.title,
      slug: bundle.slug,
      description: bundle.description,
      thumbnail_url: bundle.thumbnail_url,
      creatorId: bundle.created_by, // Get creatorId from bundle
    };
  }

  private async getItemDetails(
    itemType: CartItemType,
    itemId: string,
    currencyCode: string
  ): Promise<{
    price: number;
    title: string;
    thumbnailUrl?: string;
    courseId?: string;
    bundleId?: string;
    creatorId: string; // Add creatorId to return
  }> {
    if (itemType === CartItemType.COURSE) {
      const course = await this.courseRepository.findOne({
        where: { id: itemId },
        relations: ['pricings', 'instructor'],
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (!course.instructor) {
        throw new NotFoundException('Course instructor not found');
      }

      if (course.isCourseFree) {
        return {
          price: 0,
          title: course.name,
          thumbnailUrl: course.courseImage,
          courseId: itemId,
          creatorId: course.instructor.id,
        };
      }

      // Get pricing for the specified currency
      const pricingForCurrency = course.pricings?.find(
        pricing => pricing.isActive && pricing.currencyCode === currencyCode
      );

      if (!pricingForCurrency) {
        throw new NotFoundException(
          `No active pricing found for course in currency ${currencyCode}`
        );
      }

      const price = pricingForCurrency.salePrice || pricingForCurrency.regularPrice;

      return {
        price,
        title: course.name,
        thumbnailUrl: course.courseImage,
        courseId: itemId,
        creatorId: course.instructor.id,
      };
    } else {
      const bundle = await this.bundleRepository.findOne({
        where: { id: itemId },
        relations: ['pricings', 'creator'],
      });

      if (!bundle) {
        throw new NotFoundException('Bundle not found');
      }

      if (!bundle.created_by) {
        throw new NotFoundException('Bundle creator not found');
      }

      if (bundle.is_free) {
        return {
          price: 0,
          title: bundle.title,
          thumbnailUrl: bundle.thumbnail_url,
          bundleId: itemId,
          creatorId: bundle.created_by,
        };
      }

      // Get pricing for the specified currency
      const pricingForCurrency = bundle.pricings?.find(
        pricing => pricing.is_active && pricing.currency_code === currencyCode
      );

      if (!pricingForCurrency) {
        throw new NotFoundException(
          `No active pricing found for bundle in currency ${currencyCode}`
        );
      }

      const price = pricingForCurrency.sale_price || pricingForCurrency.regular_price;

      return {
        price,
        title: bundle.title,
        thumbnailUrl: bundle.thumbnail_url,
        bundleId: itemId,
        creatorId: bundle.created_by,
      };
    }
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
}
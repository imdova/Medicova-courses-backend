import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blog } from './entities/blog.entity';
import { BlogCategoryModule } from './blog-category/blog-category.module';

@Module({
  imports: [TypeOrmModule.forFeature([Blog]), BlogCategoryModule],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule { }

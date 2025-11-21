import { Module } from '@nestjs/common';
import { BlogTagsService } from './blog-tags.service';
import { BlogTagsController } from './blog-tags.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Blog } from '../entities/blog.entity';
import { BlogTag } from './entities/blog-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogTag, Blog]),
    // Configure Multer for file uploads (10MB limit)
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [BlogTagsController],
  providers: [BlogTagsService],
})
export class BlogTagsModule { }

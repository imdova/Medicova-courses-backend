import { PartialType } from '@nestjs/mapped-types';
import { CreateBlogTagDto } from './create-blog-tag.dto';

export class UpdateBlogTagDto extends PartialType(CreateBlogTagDto) {}

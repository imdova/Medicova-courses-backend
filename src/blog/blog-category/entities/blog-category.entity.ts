import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BasicEntity } from '../../../common/entities/basic.entity';
import { Blog } from '../../entities/blog.entity';

@Entity('blog_categories')
export class BlogCategory extends BasicEntity {
    @Column({ length: 100, unique: true })
    name: string;

    @Index({ unique: true })
    @Column({ length: 100 })
    slug: string;

    @Column({ nullable: true })
    image?: string; // Optional image URL for the category

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // --- Relations ---

    // Self-referencing: A category can be a parent to multiple subcategories
    @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
    parentId: string | null;

    // A category can have many blogs
    @OneToMany(() => Blog, (blog) => blog.category)
    blogs: Blog[];

    // A category can also be a subcategory (many blogs linked via subcategory_id)
    @OneToMany(() => Blog, (blog) => blog.subCategory)
    subCategoryBlogs: Blog[];
}
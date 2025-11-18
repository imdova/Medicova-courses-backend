import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
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
    image?: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ default: true, name: 'is_active' })
    isActive: boolean;

    // --- Relations ---

    // Self-referencing: A category can be a parent to multiple subcategories
    @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
    parentId: string | null;

    @ManyToOne(() => BlogCategory, (category) => category.subcategories, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'parent_id' })
    parent: BlogCategory;

    @OneToMany(() => BlogCategory, (category) => category.parent)
    subcategories: BlogCategory[];

    // A category can have many blogs as main category
    @OneToMany(() => Blog, (blog) => blog.category)
    blogs: Blog[];

    // A category can have many blogs as subcategory
    @OneToMany(() => Blog, (blog) => blog.subCategory)
    subCategoryBlogs: Blog[];
}
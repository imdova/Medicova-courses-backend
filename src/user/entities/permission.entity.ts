// src/auth/entities/permission.entity.ts
import { Entity, Column, OneToMany } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { RolePermission } from './roles-permission.entity';

@Entity()
export class Permission extends BasicEntity {

    @Column({ unique: true })
    name: string; // e.g., 'create_bundle', 'view_bundle' (Most likely will be an enum too, like a big enum file)

    @OneToMany(() => RolePermission, (rp) => rp.permission)
    rolePermissions: RolePermission[];
}

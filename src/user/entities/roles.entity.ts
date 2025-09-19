// src/auth/entities/role.entity.ts
import { Entity, Column, OneToMany } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { BasicEntity } from '../../common/entities/basic.entity';
import { RolePermission } from './roles-permission.entity';

@Entity()
export class Role extends BasicEntity {

    @Column({ unique: true })
    name: string; // any string name, e.g. "admin", "marketing_manager"

    @OneToMany(() => RolePermission, (rp) => rp.role)
    rolePermissions: RolePermission[];

    @OneToMany(() => User, (user) => user.role)
    users: User[];
}

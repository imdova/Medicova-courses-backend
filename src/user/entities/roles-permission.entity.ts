import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Role } from './roles.entity';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Permission } from './permission.entity';

@Entity()
export class RolePermission extends BasicEntity {
    @ManyToOne(() => Role, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
    role: Role;

    @Index()
    @Column({ type: 'uuid' })
    roleId: string;

    @ManyToOne(() => Permission, (permission) => permission.rolePermissions, { onDelete: 'CASCADE' })
    permission: Permission;

    @Index()
    @Column({ type: 'uuid' })
    permissionId: string;
}

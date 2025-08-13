import { Entity, Column } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class PasswordResetToken extends BasicEntity {
  @ApiProperty({
    description: 'Email address associated with the password reset request',
    example: 'jane.doe@example.com',
  })
  @Column()
  email: string;

  @ApiProperty({
    description: 'Unique token used for password reset verification',
    example: 'c6a1b7f0-3e1d-4a9f-8a92-3f4c2a6e17f9',
  })
  @Column()
  token: string;
}

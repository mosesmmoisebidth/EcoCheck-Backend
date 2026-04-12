import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';

@Entity('inspection_types')
export class InspectionTypeEntity extends CommonEntity {
  @ApiProperty()
  @Column({ unique: true })
  code: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty({ default: true })
  @Column({ default: true })
  active: boolean;
}

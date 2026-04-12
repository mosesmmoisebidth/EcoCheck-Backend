import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { InspectionTypeEntity } from 'src/modules/inspection-types/entities/inspection-type.entity';

@Entity('faults')
export class FaultEntity extends CommonEntity {
  @ApiProperty()
  @ManyToOne(() => InspectionTypeEntity, { eager: true })
  inspectionType: InspectionTypeEntity;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column({ name: 'standardFine' })
  standardFine: number;

  @ApiProperty({ default: true })
  @Column({ default: true })
  active: boolean;
}

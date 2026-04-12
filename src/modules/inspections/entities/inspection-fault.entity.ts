import { Column, Entity, ManyToOne } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { FaultEntity } from 'src/modules/faults/entities/fault.entity';
import { InspectionEntity } from './inspection.entity';

@Entity('inspection_faults')
export class InspectionFaultEntity extends CommonEntity {
  @ManyToOne(() => InspectionEntity, (inspection) => inspection.faults, {
    onDelete: 'CASCADE',
  })
  inspection: InspectionEntity;

  @ManyToOne(() => FaultEntity, { eager: true })
  fault: FaultEntity;

  @Column({ name: 'faultName' })
  faultName: string;

  @Column({ name: 'fineAmount' })
  fineAmount: number;
}

import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sectors')
@Index('idx_sectors_district', ['districtId'])
export class SectorEntity {
  @PrimaryColumn({ type: 'int' })
  sectorId: number;

  @Column()
  sectorName: string;

  @Column({ type: 'int' })
  districtId: number;
}

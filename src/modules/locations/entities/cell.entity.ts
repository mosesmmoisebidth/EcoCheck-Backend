import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('cells')
@Index('idx_cells_sector', ['sectorId'])
export class CellEntity {
  @PrimaryColumn({ type: 'int' })
  cellId: number;

  @Column()
  cellName: string;

  @Column({ type: 'int' })
  sectorId: number;
}

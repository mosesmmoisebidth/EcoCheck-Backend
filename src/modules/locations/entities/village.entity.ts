import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('villages')
@Index('idx_villages_cell', ['cellId'])
export class VillageEntity {
  @PrimaryColumn({ type: 'int' })
  villageId: number;

  @Column()
  villageName: string;

  @Column({ type: 'int' })
  cellId: number;
}

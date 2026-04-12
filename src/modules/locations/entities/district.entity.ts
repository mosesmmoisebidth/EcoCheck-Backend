import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('districts')
export class DistrictEntity {
  @PrimaryColumn({ type: 'int' })
  districtId: number;

  @Column()
  districtName: string;

  @Column({ type: 'int' })
  provinceId: number;
}

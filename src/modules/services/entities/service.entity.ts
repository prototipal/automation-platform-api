import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ServiceType, ServiceModel, ModelVersion } from '../enums';

export interface ServiceFields {
  [key: string]: {
    required: boolean;
    type: 'string' | 'enum' | 'boolean';
    values?: string[];
    default?: string | boolean;
    desc: string;
  };
}

@Entity('services')
@Index(['model', 'model_version'], { unique: true })
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'replicate',
    nullable: false,
  })
  from: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
    nullable: false,
  })
  type: ServiceType;

  @Column({
    type: 'enum',
    enum: ServiceModel,
    nullable: false,
  })
  model: ServiceModel;

  @Column({
    type: 'enum',
    enum: ModelVersion,
    nullable: true,
  })
  model_version: ModelVersion | null;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  fields: ServiceFields;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}

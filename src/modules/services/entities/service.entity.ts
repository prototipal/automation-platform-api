import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  ServiceType,
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
  ModelVersion,
} from '../enums';
import { PricingRule } from '../interfaces/pricing.interface';

export interface ServiceFields {
  [key: string]: {
    required: boolean;
    type: 'string' | 'enum' | 'boolean' | 'array';
    values?: string[];
    items?: string;
    default?: string | boolean;
    desc: string;
  };
}

export interface ServicePricing {
  rule: PricingRule;
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
    enum: [
      ...Object.values(TextToImageModelVersion),
      ...Object.values(TextToVideoModelVersion),
    ],
    nullable: true,
  })
  model_version: ModelVersion | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  display_name: string | null;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  fields: ServiceFields;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  pricing: ServicePricing;

  @Column({
    type: 'text',
    nullable: true,
  })
  logo: string | null;

  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  is_active: boolean;

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

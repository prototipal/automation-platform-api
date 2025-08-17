import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { MainCategory } from './main-category.entity';

// Template import removed to prevent circular dependency - using string reference instead

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  link: string;

  @Column({
    type: 'enum',
    enum: ['photo', 'video'],
    default: 'photo',
    nullable: false,
  })
  type: 'photo' | 'video';

  @Column({
    name: 'main_category_id',
    type: 'uuid',
    nullable: true,
  })
  mainCategoryId: string;

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

  @OneToMany('Template', 'category')
  templates: any[];

  @ManyToOne(() => MainCategory, (mainCategory) => mainCategory.categories, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'main_category_id' })
  mainCategory: MainCategory;
}

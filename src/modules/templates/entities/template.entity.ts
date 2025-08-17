import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// Category import removed to prevent circular dependency - using string reference instead

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  category_id: string;

  @ManyToOne('Category', 'templates', {
    eager: true, // Automatically load category when loading template
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category: any;

  @Column({
    type: 'text',
    nullable: false,
  })
  image_url: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  prompt: string;

  @Column({
    type: 'enum',
    enum: ['photo', 'video'],
    default: 'photo',
    nullable: false,
  })
  type: 'photo' | 'video';

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

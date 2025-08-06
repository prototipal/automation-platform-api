import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  category_name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  category_link: string;

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
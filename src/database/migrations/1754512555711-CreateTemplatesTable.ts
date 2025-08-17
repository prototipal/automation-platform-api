import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTemplatesTable1754512555711 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'category_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'category_link',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'image_url',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'prompt',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['photo', 'video'],
            default: "'photo'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_templates_category_name',
            columnNames: ['category_name'],
          },
          {
            name: 'IDX_templates_type',
            columnNames: ['type'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('templates');
  }
}

import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class UpdateTemplatesTableWithCategoryRelation1754513600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add category_id column to templates table
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'category_id',
        type: 'uuid',
        isNullable: true, // Temporarily nullable for data migration
      }),
    );

    // Update templates to link with categories based on category_name
    await queryRunner.query(`
            UPDATE templates 
            SET category_id = (
                SELECT c.id 
                FROM categories c 
                WHERE c.name = templates.category_name 
                LIMIT 1
            )
            WHERE category_name IS NOT NULL AND category_name != ''
        `);

    // Make category_id NOT NULL after data migration
    await queryRunner.changeColumn(
      'templates',
      'category_id',
      new TableColumn({
        name: 'category_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    // Create foreign key constraint
    await queryRunner.createForeignKey(
      'templates',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'RESTRICT', // Prevent deleting categories that have templates
        onUpdate: 'CASCADE',
        name: 'FK_templates_category_id',
      }),
    );

    // Add index for category_id
    await queryRunner.createIndex(
      'templates',
      new TableIndex({
        name: 'IDX_templates_category_id',
        columnNames: ['category_id'],
      }),
    );

    // Drop old indices that reference category_name (if they exist)
    const indices = await queryRunner.query(`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'templates' AND indexname = 'IDX_templates_category_name'
        `);

    if (indices.length > 0) {
      await queryRunner.dropIndex('templates', 'IDX_templates_category_name');
    }

    // Remove old category_name and category_link columns
    await queryRunner.dropColumn('templates', 'category_name');
    await queryRunner.dropColumn('templates', 'category_link');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old columns
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'category_name',
        type: 'varchar',
        length: '255',
        isNullable: false,
        default: "'General'", // Default value for rollback
      }),
    );

    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'category_link',
        type: 'text',
        isNullable: true,
      }),
    );

    // Restore data from categories table
    await queryRunner.query(`
            UPDATE templates 
            SET 
                category_name = c.name,
                category_link = c.link
            FROM categories c 
            WHERE templates.category_id = c.id
        `);

    // Recreate old index
    await queryRunner.createIndex(
      'templates',
      new TableIndex({
        name: 'IDX_templates_category_name',
        columnNames: ['category_name'],
      }),
    );

    // Drop foreign key constraint
    await queryRunner.dropForeignKey('templates', 'FK_templates_category_id');

    // Drop index for category_id
    await queryRunner.dropIndex('templates', 'IDX_templates_category_id');

    // Remove category_id column
    await queryRunner.dropColumn('templates', 'category_id');
  }
}

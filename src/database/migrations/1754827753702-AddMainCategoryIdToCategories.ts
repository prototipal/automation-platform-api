import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddMainCategoryIdToCategories1754827753702
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if main_category_id column already exists
    const table = await queryRunner.getTable('categories');
    const hasMainCategoryIdColumn = table?.findColumnByName('main_category_id');

    if (!hasMainCategoryIdColumn) {
      // Add main_category_id column to categories table only if it doesn't exist
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'main_category_id',
          type: 'uuid',
          isNullable: true, // Initially nullable to allow existing records
        }),
      );
    }

    // Check if index already exists before creating it
    const hasIndex = table?.indices.find(
      (index) => index.name === 'IDX_categories_main_category_id',
    );
    if (!hasIndex) {
      // Create index for main_category_id
      await queryRunner.createIndex(
        'categories',
        new TableIndex({
          name: 'IDX_categories_main_category_id',
          columnNames: ['main_category_id'],
        }),
      );
    }

    // Check if foreign key already exists before creating it
    const hasForeignKey = table?.foreignKeys.find(
      (fk) => fk.name === 'FK_categories_main_category',
    );
    if (!hasForeignKey) {
      // Create foreign key constraint
      await queryRunner.createForeignKey(
        'categories',
        new TableForeignKey({
          columnNames: ['main_category_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'main_categories',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          name: 'FK_categories_main_category',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if foreign key exists before dropping it
    const table = await queryRunner.getTable('categories');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.name === 'FK_categories_main_category',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey(
        'categories',
        'FK_categories_main_category',
      );
    }

    // Check if index exists before dropping it
    const hasIndex = table?.indices.find(
      (index) => index.name === 'IDX_categories_main_category_id',
    );
    if (hasIndex) {
      await queryRunner.dropIndex(
        'categories',
        'IDX_categories_main_category_id',
      );
    }

    // Check if column exists before dropping it
    const hasColumn = table?.findColumnByName('main_category_id');
    if (hasColumn) {
      await queryRunner.dropColumn('categories', 'main_category_id');
    }
  }
}

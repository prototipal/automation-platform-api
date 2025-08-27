import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserPackagesIdToUuid1755804801037
  implements MigrationInterface
{
  name = 'UpdateUserPackagesIdToUuid1755804801037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, backup existing data
    await queryRunner.query(`
            CREATE TEMP TABLE user_packages_backup AS 
            SELECT * FROM user_packages;
        `);

    // Drop existing foreign key constraints and indexes that reference the id column
    const table = await queryRunner.getTable('user_packages');
    const foreignKeys = table.foreignKeys || [];

    for (const fk of foreignKeys) {
      if (fk.referencedTableName !== 'packages') {
        await queryRunner.dropForeignKey('user_packages', fk);
      }
    }

    // Drop the primary key constraint
    await queryRunner.query(
      `ALTER TABLE user_packages DROP CONSTRAINT IF EXISTS "PK_user_packages"`,
    );

    // Add new UUID id column
    await queryRunner.query(
      `ALTER TABLE user_packages ADD COLUMN id_new UUID DEFAULT gen_random_uuid()`,
    );

    // Update all rows to have UUID values
    await queryRunner.query(
      `UPDATE user_packages SET id_new = gen_random_uuid() WHERE id_new IS NULL`,
    );

    // Drop the old id column
    await queryRunner.query(`ALTER TABLE user_packages DROP COLUMN id`);

    // Rename the new column to id
    await queryRunner.query(
      `ALTER TABLE user_packages RENAME COLUMN id_new TO id`,
    );

    // Add primary key constraint back
    await queryRunner.query(
      `ALTER TABLE user_packages ADD CONSTRAINT "PK_user_packages" PRIMARY KEY (id)`,
    );

    // Make id column not nullable
    await queryRunner.query(
      `ALTER TABLE user_packages ALTER COLUMN id SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop primary key
    await queryRunner.query(
      `ALTER TABLE user_packages DROP CONSTRAINT IF EXISTS "PK_user_packages"`,
    );

    // Add old integer id column
    await queryRunner.query(
      `ALTER TABLE user_packages ADD COLUMN id_new SERIAL`,
    );

    // Drop UUID id column
    await queryRunner.query(`ALTER TABLE user_packages DROP COLUMN id`);

    // Rename new column to id
    await queryRunner.query(
      `ALTER TABLE user_packages RENAME COLUMN id_new TO id`,
    );

    // Add primary key constraint back
    await queryRunner.query(
      `ALTER TABLE user_packages ADD CONSTRAINT "PK_user_packages" PRIMARY KEY (id)`,
    );
  }
}

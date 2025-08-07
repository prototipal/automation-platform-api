import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToServices1754513200000 implements MigrationInterface {
  name = 'AddIsActiveToServices1754513200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_active column to services table with default value true (only if it doesn't exist)
    const hasColumn = await queryRunner.hasColumn('services', 'is_active');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "services" ADD "is_active" boolean NOT NULL DEFAULT true`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove is_active column from services table
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "is_active"`);
  }
}
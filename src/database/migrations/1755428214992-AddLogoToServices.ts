import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogoToServices1755428214992 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if logo column already exists
    const hasColumn = await queryRunner.hasColumn('services', 'logo');
    
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "services" ADD "logo" text`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "logo"`);
  }
}

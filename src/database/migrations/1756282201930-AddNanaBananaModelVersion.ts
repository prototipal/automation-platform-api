import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNanaBananaModelVersion1756282201930
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE "public"."services_model_version_enum" 
            ADD VALUE IF NOT EXISTS 'nano-banana'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in PostgreSQL
    // This migration is irreversible
  }
}

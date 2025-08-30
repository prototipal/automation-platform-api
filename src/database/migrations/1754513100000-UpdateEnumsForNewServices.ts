import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnumsForNewServices1754513100000
  implements MigrationInterface
{
  name = 'UpdateEnumsForNewServices1754513100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new model values to service_model_enum
    await queryRunner.query(
      `ALTER TYPE "service_model_enum" ADD VALUE 'ideogram-ai'`,
    );

    // Add new model version values to model_version_enum
    await queryRunner.query(
      `ALTER TYPE "model_version_enum" ADD VALUE 'ideogram-v3-turbo'`,
    );
    await queryRunner.query(
      `ALTER TYPE "model_version_enum" ADD VALUE 'imagen-4-fast'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values
    // This would require recreating the enum type which is complex
    console.log(
      'Removing enum values is not supported in PostgreSQL without recreating the type',
    );
  }
}

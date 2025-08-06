import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewEnumValues1754513300000 implements MigrationInterface {
  name = 'AddNewEnumValues1754513300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new model value to services_model_enum
    await queryRunner.query(`ALTER TYPE "services_model_enum" ADD VALUE 'black-forest-labs'`);

    // Add new model version value to services_model_version_enum
    await queryRunner.query(`ALTER TYPE "services_model_version_enum" ADD VALUE 'flux-kontext-max'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values
    // This would require recreating the enum type which is complex
    console.log('Removing enum values is not supported in PostgreSQL without recreating the type');
  }
}
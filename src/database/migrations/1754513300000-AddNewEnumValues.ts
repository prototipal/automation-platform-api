import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewEnumValues1754513300000 implements MigrationInterface {
  name = 'AddNewEnumValues1754513300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if enum value exists before adding it
    const modelEnumValues = await queryRunner.query(`
      SELECT enumlabel FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'services_model_enum' AND enumlabel = 'black-forest-labs'
    `);

    if (modelEnumValues.length === 0) {
      await queryRunner.query(`ALTER TYPE "services_model_enum" ADD VALUE 'black-forest-labs'`);
    }

    const versionEnumValues = await queryRunner.query(`
      SELECT enumlabel FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'services_model_version_enum' AND enumlabel = 'flux-kontext-max'
    `);

    if (versionEnumValues.length === 0) {
      await queryRunner.query(`ALTER TYPE "services_model_version_enum" ADD VALUE 'flux-kontext-max'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values
    // This would require recreating the enum type which is complex
    console.log('Removing enum values is not supported in PostgreSQL without recreating the type');
  }
}
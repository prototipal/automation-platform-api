import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateServicesTable1733424000000 implements MigrationInterface {
  name = 'CreateServicesTable1733424000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      CREATE TYPE "service_type_enum" AS ENUM('image-to-video', 'text-to-image')
    `);

    await queryRunner.query(`
      CREATE TYPE "service_model_enum" AS ENUM('google', 'kwaigi', 'minimax', 'bytedance', 'wan-video', 'wavespeedai')
    `);

    await queryRunner.query(`
      CREATE TYPE "model_version_enum" AS ENUM('hailuo-02', 'veo-3-fast', 'seedance-1-pro', 'veo-3', 'video-01', 'kling-v2.1')
    `);

    // Create the services table
    await queryRunner.createTable(
      new Table({
        name: 'services',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'from',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'replicate'",
          },
          {
            name: 'type',
            type: 'service_type_enum',
            isNullable: false,
          },
          {
            name: 'model',
            type: 'service_model_enum',
            isNullable: false,
          },
          {
            name: 'model_version',
            type: 'model_version_enum',
            isNullable: true,
          },
          {
            name: 'fields',
            type: 'jsonb',
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
          },
        ],
      }),
      true,
    );

    // Create unique index on model and model_version
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_services_model_version" ON "services" ("model", "model_version")
    `);

    // Create index on type for faster filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_services_type" ON "services" ("type")
    `);

    // Create index on created_at for sorting
    await queryRunner.query(`
      CREATE INDEX "IDX_services_created_at" ON "services" ("created_at")
    `);

    // Enable uuid-ossp extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_services_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_services_type"`);
    await queryRunner.query(`DROP INDEX "IDX_services_model_version"`);

    // Drop table
    await queryRunner.dropTable('services');

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE "model_version_enum"`);
    await queryRunner.query(`DROP TYPE "service_model_enum"`);
    await queryRunner.query(`DROP TYPE "service_type_enum"`);
  }
}

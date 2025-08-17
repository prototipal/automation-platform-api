import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateUserIdFieldsToUuid1755124100320
  implements MigrationInterface
{
  name = 'UpdateUserIdFieldsToUuid1755124100320';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Check if tables exist
    const sessionsTableExists = await queryRunner.hasTable('sessions');
    const generationsTableExists = await queryRunner.hasTable('generations');

    // Step 2: Update sessions table if it exists
    if (sessionsTableExists) {
      // Drop indexes first to avoid conflicts
      try {
        await queryRunner.dropIndex('sessions', 'idx_session_user_id');
      } catch (error) {
        console.log('Index idx_session_user_id might not exist, continuing...');
      }

      try {
        await queryRunner.dropIndex('sessions', 'idx_session_user_id_lookup');
      } catch (error) {
        console.log(
          'Index idx_session_user_id_lookup might not exist, continuing...',
        );
      }

      try {
        await queryRunner.dropIndex('sessions', 'idx_session_user_active');
      } catch (error) {
        console.log(
          'Index idx_session_user_active might not exist, continuing...',
        );
      }

      // Change column type from int to uuid
      await queryRunner.changeColumn(
        'sessions',
        'user_id',
        new TableColumn({
          name: 'user_id',
          type: 'uuid',
          isNullable: false,
        }),
      );

      // Recreate indexes
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "sessions" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_session_user_id_lookup" ON "sessions" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_session_user_active" ON "sessions" ("user_id", "is_active")`,
      );
    }

    // Step 3: Update generations table if it exists
    if (generationsTableExists) {
      // Drop indexes first to avoid conflicts
      try {
        await queryRunner.dropIndex('generations', 'idx_generation_user_id');
      } catch (error) {
        console.log(
          'Index idx_generation_user_id might not exist, continuing...',
        );
      }

      try {
        await queryRunner.dropIndex(
          'generations',
          'idx_generation_user_lookup',
        );
      } catch (error) {
        console.log(
          'Index idx_generation_user_lookup might not exist, continuing...',
        );
      }

      try {
        await queryRunner.dropIndex(
          'generations',
          'idx_generation_user_session',
        );
      } catch (error) {
        console.log(
          'Index idx_generation_user_session might not exist, continuing...',
        );
      }

      // Change column type from int to uuid
      await queryRunner.changeColumn(
        'generations',
        'user_id',
        new TableColumn({
          name: 'user_id',
          type: 'uuid',
          isNullable: false,
        }),
      );

      // Recreate indexes
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_generation_user_id" ON "generations" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_generation_user_lookup" ON "generations" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_generation_user_session" ON "generations" ("user_id", "session_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Convert UUID back to integer
    // WARNING: This will cause data loss if UUIDs can't be converted to integers

    const sessionsTableExists = await queryRunner.hasTable('sessions');
    const generationsTableExists = await queryRunner.hasTable('generations');

    // Rollback sessions table
    if (sessionsTableExists) {
      // Drop UUID indexes
      try {
        await queryRunner.dropIndex('sessions', 'idx_session_user_id');
        await queryRunner.dropIndex('sessions', 'idx_session_user_id_lookup');
        await queryRunner.dropIndex('sessions', 'idx_session_user_active');
      } catch (error) {
        console.log(
          'Some indexes might not exist during rollback, continuing...',
        );
      }

      // Change back to int (this will cause data loss for UUID values)
      await queryRunner.changeColumn(
        'sessions',
        'user_id',
        new TableColumn({
          name: 'user_id',
          type: 'int',
          isNullable: false,
        }),
      );

      // Recreate integer indexes
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "sessions" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_session_user_id_lookup" ON "sessions" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_session_user_active" ON "sessions" ("user_id", "is_active")`,
      );
    }

    // Rollback generations table
    if (generationsTableExists) {
      // Drop UUID indexes
      try {
        await queryRunner.dropIndex('generations', 'idx_generation_user_id');
        await queryRunner.dropIndex(
          'generations',
          'idx_generation_user_lookup',
        );
        await queryRunner.dropIndex(
          'generations',
          'idx_generation_user_session',
        );
      } catch (error) {
        console.log(
          'Some indexes might not exist during rollback, continuing...',
        );
      }

      // Change back to int (this will cause data loss for UUID values)
      await queryRunner.changeColumn(
        'generations',
        'user_id',
        new TableColumn({
          name: 'user_id',
          type: 'int',
          isNullable: false,
        }),
      );

      // Recreate integer indexes
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_generation_user_id" ON "generations" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_generation_user_lookup" ON "generations" ("user_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_generation_user_session" ON "generations" ("user_id", "session_id")`,
      );
    }
  }
}

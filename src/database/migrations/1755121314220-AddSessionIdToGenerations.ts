import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableColumn,
} from 'typeorm';

export class AddSessionIdToGenerations1755121314220
  implements MigrationInterface
{
  name = 'AddSessionIdToGenerations1755121314220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, create the generations table if it doesn't exist
    const generationsTableExists = await queryRunner.hasTable('generations');

    if (!generationsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'generations',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'user_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'session_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'replicate_id',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'model',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'model_version',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'input_parameters',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'output_data',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'processing', 'completed', 'failed'],
              default: "'pending'",
            },
            {
              name: 'credits_used',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'error_message',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'supabase_urls',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'processing_time_seconds',
              type: 'decimal',
              precision: 8,
              scale: 2,
              isNullable: true,
            },
            {
              name: 'metadata',
              type: 'jsonb',
              isNullable: true,
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

      // Create indexes for better query performance
      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_user_id',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_session_id',
          columnNames: ['session_id'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_created_at',
          columnNames: ['created_at'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_user_lookup',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_session_lookup',
          columnNames: ['session_id'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_replicate_id',
          columnNames: ['replicate_id'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_status',
          columnNames: ['status'],
        }),
      );

      // Add composite indexes for common queries
      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_user_session',
          columnNames: ['user_id', 'session_id'],
        }),
      );

      await queryRunner.createIndex(
        'generations',
        new TableIndex({
          name: 'idx_generation_session_status',
          columnNames: ['session_id', 'status'],
        }),
      );
    } else {
      // If table exists, check if session_id column exists and add it if not
      const sessionIdColumnExists = await queryRunner.hasColumn(
        'generations',
        'session_id',
      );

      if (!sessionIdColumnExists) {
        await queryRunner.addColumn(
          'generations',
          new TableColumn({
            name: 'session_id',
            type: 'int',
            isNullable: true, // Initially nullable for existing records
          }),
        );

        // Update existing records to have a default session (you might want to handle this differently)
        await queryRunner.query(`
                    INSERT INTO sessions (user_id, name, description, is_active, created_at, updated_at)
                    SELECT DISTINCT 
                        user_id, 
                        'Legacy Session' as name, 
                        'Auto-created session for existing generations' as description,
                        true as is_active,
                        MIN(created_at) as created_at,
                        CURRENT_TIMESTAMP as updated_at
                    FROM generations 
                    WHERE session_id IS NULL
                    GROUP BY user_id
                    ON CONFLICT DO NOTHING;
                `);

        // Update generations to reference the legacy sessions
        await queryRunner.query(`
                    UPDATE generations 
                    SET session_id = s.id
                    FROM sessions s 
                    WHERE generations.user_id = s.user_id 
                    AND generations.session_id IS NULL 
                    AND s.name = 'Legacy Session';
                `);

        // Now make the column not nullable
        await queryRunner.changeColumn(
          'generations',
          'session_id',
          new TableColumn({
            name: 'session_id',
            type: 'int',
            isNullable: false,
          }),
        );

        // Add indexes for session_id (only if they don't exist)
        try {
          await queryRunner.createIndex(
            'generations',
            new TableIndex({
              name: 'idx_generation_session_id',
              columnNames: ['session_id'],
            }),
          );
        } catch (error) {
          if (error.message && error.message.includes('already exists')) {
            console.log(
              'Index idx_generation_session_id already exists, skipping...',
            );
          } else {
            throw error;
          }
        }

        try {
          await queryRunner.createIndex(
            'generations',
            new TableIndex({
              name: 'idx_generation_session_lookup',
              columnNames: ['session_id'],
            }),
          );
        } catch (error) {
          if (error.message && error.message.includes('already exists')) {
            console.log(
              'Index idx_generation_session_lookup already exists, skipping...',
            );
          } else {
            throw error;
          }
        }

        try {
          await queryRunner.createIndex(
            'generations',
            new TableIndex({
              name: 'idx_generation_user_session',
              columnNames: ['user_id', 'session_id'],
            }),
          );
        } catch (error) {
          if (error.message && error.message.includes('already exists')) {
            console.log(
              'Index idx_generation_user_session already exists, skipping...',
            );
          } else {
            throw error;
          }
        }

        try {
          await queryRunner.createIndex(
            'generations',
            new TableIndex({
              name: 'idx_generation_session_status',
              columnNames: ['session_id', 'status'],
            }),
          );
        } catch (error) {
          if (error.message && error.message.includes('already exists')) {
            console.log(
              'Index idx_generation_session_status already exists, skipping...',
            );
          } else {
            throw error;
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const generationsTableExists = await queryRunner.hasTable('generations');

    if (generationsTableExists) {
      // Drop indexes first
      await queryRunner.dropIndex(
        'generations',
        'idx_generation_session_status',
      );
      await queryRunner.dropIndex('generations', 'idx_generation_user_session');
      await queryRunner.dropIndex(
        'generations',
        'idx_generation_session_lookup',
      );
      await queryRunner.dropIndex('generations', 'idx_generation_session_id');
      await queryRunner.dropIndex('generations', 'idx_generation_status');
      await queryRunner.dropIndex('generations', 'idx_generation_replicate_id');
      await queryRunner.dropIndex('generations', 'idx_generation_user_lookup');
      await queryRunner.dropIndex('generations', 'idx_generation_created_at');
      await queryRunner.dropIndex('generations', 'idx_generation_user_id');

      // Drop table (this will also remove the session_id column)
      await queryRunner.dropTable('generations');
    }
  }
}

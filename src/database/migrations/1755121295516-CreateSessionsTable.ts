import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSessionsTable1755121295516 implements MigrationInterface {
    name = 'CreateSessionsTable1755121295516'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if sessions table already exists
        const tableExists = await queryRunner.hasTable('sessions');
        
        if (tableExists) {
            // Table already exists, skip creation
            console.log('Sessions table already exists, skipping creation...');
            return;
        }

        await queryRunner.createTable(
            new Table({
                name: 'sessions',
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
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
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
            true
        );

        // Create indexes for better query performance (with error handling)
        try {
            await queryRunner.createIndex(
                'sessions',
                new TableIndex({
                    name: 'idx_session_user_id',
                    columnNames: ['user_id']
                })
            );
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                console.log('Index idx_session_user_id already exists, skipping...');
            } else {
                throw error;
            }
        }

        try {
            await queryRunner.createIndex(
                'sessions',
                new TableIndex({
                    name: 'idx_session_user_id_lookup',
                    columnNames: ['user_id']
                })
            );
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                console.log('Index idx_session_user_id_lookup already exists, skipping...');
            } else {
                throw error;
            }
        }

        try {
            await queryRunner.createIndex(
                'sessions',
                new TableIndex({
                    name: 'idx_session_created_at',
                    columnNames: ['created_at']
                })
            );
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                console.log('Index idx_session_created_at already exists, skipping...');
            } else {
                throw error;
            }
        }

        try {
            await queryRunner.createIndex(
                'sessions',
                new TableIndex({
                    name: 'idx_session_is_active',
                    columnNames: ['is_active']
                })
            );
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                console.log('Index idx_session_is_active already exists, skipping...');
            } else {
                throw error;
            }
        }

        // Add composite index for common queries
        try {
            await queryRunner.createIndex(
                'sessions',
                new TableIndex({
                    name: 'idx_session_user_active',
                    columnNames: ['user_id', 'is_active']
                })
            );
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                console.log('Index idx_session_user_active already exists, skipping...');
            } else {
                throw error;
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.dropIndex('sessions', 'idx_session_user_active');
        await queryRunner.dropIndex('sessions', 'idx_session_is_active');
        await queryRunner.dropIndex('sessions', 'idx_session_created_at');
        await queryRunner.dropIndex('sessions', 'idx_session_user_id_lookup');
        await queryRunner.dropIndex('sessions', 'idx_session_user_id');
        
        // Drop table
        await queryRunner.dropTable('sessions');
    }
}

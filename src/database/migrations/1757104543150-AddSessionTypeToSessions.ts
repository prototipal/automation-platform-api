import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionTypeToSessions1757104543150 implements MigrationInterface {
    name = 'AddSessionTypeToSessions1757104543150';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add session_type column to sessions table
        await queryRunner.query(`
            ALTER TABLE "sessions" 
            ADD "session_type" varchar(20) NOT NULL DEFAULT 'photo'
        `);

        // Create index for session_type for better query performance
        await queryRunner.query(`
            CREATE INDEX "idx_sessions_session_type" 
            ON "sessions" ("session_type")
        `);

        // Update existing sessions to have 'photo' as default type
        await queryRunner.query(`
            UPDATE "sessions" 
            SET "session_type" = 'photo' 
            WHERE "session_type" IS NULL OR "session_type" = ''
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove index
        await queryRunner.query(`DROP INDEX "idx_sessions_session_type"`);
        
        // Remove session_type column
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "session_type"`);
    }
}

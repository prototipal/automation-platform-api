import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStartingStatusToGenerations1757097669526 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'starting' to the status enum in generations table
        await queryRunner.query(`
            ALTER TYPE "generations_status_enum" 
            ADD VALUE IF NOT EXISTS 'starting' 
            BEFORE 'processing'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing values from enums directly
        // This would require creating a new enum and updating the column
        // For now, we'll leave the enum value as it won't break anything
        console.warn('Cannot remove enum value "starting" - manual database cleanup may be required');
    }

}

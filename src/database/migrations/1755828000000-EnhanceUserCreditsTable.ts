import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceUserCreditsTable1755828000000
  implements MigrationInterface
{
  name = 'EnhanceUserCreditsTable1755828000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if user_credits table exists, if not create it
    const tableExists = await queryRunner.hasTable('user_credits');

    if (!tableExists) {
      // Create the user_credits table if it doesn't exist
      await queryRunner.query(`
                CREATE TABLE "user_credits" (
                    "id" SERIAL NOT NULL,
                    "user_id" uuid NOT NULL,
                    "balance" integer NOT NULL DEFAULT 0,
                    "is_active" boolean NOT NULL DEFAULT true,
                    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_user_credits" PRIMARY KEY ("id")
                )
            `);

      await queryRunner.query(`
                CREATE INDEX "idx_user_credits_user_id" ON "user_credits" ("user_id")
            `);
    }

    // Add new columns for dual credit system
    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "playground_credits" integer NOT NULL DEFAULT 0
        `);

    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "api_credits" integer NOT NULL DEFAULT 0
        `);

    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "playground_credits_used_current_period" integer NOT NULL DEFAULT 0
        `);

    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "api_credits_used_total" integer NOT NULL DEFAULT 0
        `);

    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "playground_credits_last_reset" TIMESTAMP WITH TIME ZONE
        `);

    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "playground_credits_next_reset" TIMESTAMP WITH TIME ZONE
        `);

    await queryRunner.query(`
            ALTER TABLE "user_credits" 
            ADD COLUMN IF NOT EXISTS "metadata" jsonb
        `);

    // Create new indexes for performance
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_user_credits_user_id_active" 
            ON "user_credits" ("user_id", "is_active")
        `);

    // Migrate existing data: move balance to playground_credits
    await queryRunner.query(`
            UPDATE "user_credits" 
            SET 
                "playground_credits" = COALESCE("balance", 0),
                "api_credits" = 0,
                "playground_credits_used_current_period" = 0,
                "api_credits_used_total" = 0,
                "metadata" = jsonb_build_object(
                    'migrated', true,
                    'migration_date', now(),
                    'original_balance', COALESCE("balance", 0)
                )
            WHERE "playground_credits" = 0 AND "api_credits" = 0
        `);

    console.log('Enhanced user_credits table with dual credit system');
    console.log('Migrated existing balance data to playground_credits');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_user_credits_user_id_active"`,
    );

    // Remove new columns (in reverse order of creation)
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "playground_credits_next_reset"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "playground_credits_last_reset"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "api_credits_used_total"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "playground_credits_used_current_period"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "api_credits"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_credits" DROP COLUMN IF EXISTS "playground_credits"`,
    );

    console.log('Reverted user_credits table enhancement');
  }
}

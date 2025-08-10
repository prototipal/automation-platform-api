import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedPrototipalHaloMainCategory1754827786875 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert the "Prototipal Halo" main category
        const insertResult = await queryRunner.query(`
            INSERT INTO main_categories (name, type, created_at, updated_at)
            VALUES ('Prototipal Halo', 'photo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        `);

        const mainCategoryId = insertResult[0].id;

        // Update all existing categories to reference the "Prototipal Halo" main category
        await queryRunner.query(`
            UPDATE categories 
            SET main_category_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE main_category_id IS NULL
        `, [mainCategoryId]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the foreign key references from categories
        await queryRunner.query(`
            UPDATE categories 
            SET main_category_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE main_category_id IN (
                SELECT id FROM main_categories WHERE name = 'Prototipal Halo'
            )
        `);

        // Remove the "Prototipal Halo" main category
        await queryRunner.query(`
            DELETE FROM main_categories 
            WHERE name = 'Prototipal Halo'
        `);
    }

}
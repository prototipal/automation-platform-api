import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCategoriesFromTemplates1754513500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Extract unique categories from existing templates
        // This will handle any existing data by creating categories from unique category_name values
        await queryRunner.query(`
            INSERT INTO categories (name, link, type, created_at, updated_at)
            SELECT DISTINCT 
                category_name as name,
                category_link as link,
                'photo'::categories_type_enum as type,
                CURRENT_TIMESTAMP as created_at,
                CURRENT_TIMESTAMP as updated_at
            FROM templates 
            WHERE category_name IS NOT NULL 
                AND category_name != ''
                AND NOT EXISTS (
                    SELECT 1 FROM categories 
                    WHERE categories.name = templates.category_name
                )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove all categories that were created from templates
        // This is a safe rollback as we're only removing categories that came from templates
        await queryRunner.query(`
            DELETE FROM categories 
            WHERE id IN (
                SELECT DISTINCT c.id 
                FROM categories c 
                INNER JOIN templates t ON c.name = t.category_name
            )
        `);
    }

}
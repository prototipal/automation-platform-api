import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreatePackagesTable1755721796056 implements MigrationInterface {
    name = 'CreatePackagesTable1755721796056'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "packages",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "100",
                        isNullable: false,
                    },
                    {
                        name: "type",
                        type: "enum",
                        enum: ["free", "basic", "pro", "ultimate"],
                        isNullable: false,
                        isUnique: true,
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "monthly_price_cents",
                        type: "int",
                        isNullable: false,
                        default: 0,
                    },
                    {
                        name: "yearly_price_cents",
                        type: "int",
                        isNullable: false,
                        default: 0,
                    },
                    {
                        name: "stripe_monthly_price_id",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "stripe_yearly_price_id",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "monthly_credits",
                        type: "int",
                        isNullable: false,
                        default: 0,
                    },
                    {
                        name: "max_generations_per_month",
                        type: "int",
                        isNullable: true,
                    },
                    {
                        name: "features",
                        type: "jsonb",
                        isNullable: true,
                    },
                    {
                        name: "priority",
                        type: "int",
                        isNullable: false,
                        default: 0,
                    },
                    {
                        name: "is_active",
                        type: "boolean",
                        isNullable: false,
                        default: true,
                    },
                    {
                        name: "is_default",
                        type: "boolean",
                        isNullable: false,
                        default: false,
                    },
                    {
                        name: "metadata",
                        type: "jsonb",
                        isNullable: true,
                    },
                    {
                        name: "created_at",
                        type: "timestamp with time zone",
                        default: "CURRENT_TIMESTAMP",
                        isNullable: false,
                    },
                    {
                        name: "updated_at",
                        type: "timestamp with time zone",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                        isNullable: false,
                    },
                ],
            }),
            true
        );

        // Create indexes with IF NOT EXISTS
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_package_type" ON "packages" ("type")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_package_is_active" ON "packages" ("is_active")`);

        // Insert default packages
        await queryRunner.query(`
            INSERT INTO packages (name, type, description, monthly_price_cents, yearly_price_cents, monthly_credits, max_generations_per_month, features, priority, is_active, is_default) 
            VALUES 
            ('Free Plan', 'free', 'Get started with basic features', 0, 0, 100, 50, '{"api_access": false, "priority_support": false, "advanced_models": [], "max_resolution": "HD", "commercial_license": false}', 1, true, true),
            ('Basic Plan', 'basic', 'Perfect for individuals and small projects', 999, 9999, 500, 250, '{"api_access": true, "priority_support": false, "advanced_models": ["KLING_V2_1"], "max_resolution": "HD", "commercial_license": true}', 2, true, false),
            ('Pro Plan', 'pro', 'Ideal for professionals and growing businesses', 2999, 29999, 2000, 1000, '{"api_access": true, "priority_support": true, "advanced_models": ["KLING_V2_1", "PIKA_V2"], "max_resolution": "4K", "commercial_license": true}', 3, true, false),
            ('Ultimate Plan', 'ultimate', 'Maximum power for enterprises and heavy users', 9999, 99999, 10000, null, '{"api_access": true, "priority_support": true, "advanced_models": ["KLING_V2_1", "PIKA_V2", "RUNWAY_V3"], "max_resolution": "4K", "commercial_license": true, "unlimited_generations": true}', 4, true, false)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("packages", "idx_package_is_active");
        await queryRunner.dropIndex("packages", "idx_package_type");
        await queryRunner.dropTable("packages");
    }

}

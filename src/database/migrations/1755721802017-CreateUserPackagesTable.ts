import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateUserPackagesTable1755721802017 implements MigrationInterface {
    name = 'CreateUserPackagesTable1755721802017'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "user_packages",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "user_id",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "package_id",
                        type: "int",
                        isNullable: false,
                    },
                    {
                        name: "stripe_subscription_id",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "stripe_customer_id",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "status",
                        type: "enum",
                        enum: ["active", "inactive", "cancelled", "past_due", "unpaid", "trialing"],
                        default: "'active'",
                        isNullable: false,
                    },
                    {
                        name: "billing_interval",
                        type: "enum",
                        enum: ["month", "year"],
                        isNullable: true,
                    },
                    {
                        name: "current_period_start",
                        type: "timestamp with time zone",
                        isNullable: true,
                    },
                    {
                        name: "current_period_end",
                        type: "timestamp with time zone",
                        isNullable: true,
                    },
                    {
                        name: "credits_used_current_period",
                        type: "int",
                        isNullable: false,
                        default: 0,
                    },
                    {
                        name: "generations_current_period",
                        type: "int",
                        isNullable: false,
                        default: 0,
                    },
                    {
                        name: "cancel_at_period_end",
                        type: "boolean",
                        isNullable: false,
                        default: false,
                    },
                    {
                        name: "cancelled_at",
                        type: "timestamp with time zone",
                        isNullable: true,
                    },
                    {
                        name: "trial_start",
                        type: "timestamp with time zone",
                        isNullable: true,
                    },
                    {
                        name: "trial_end",
                        type: "timestamp with time zone",
                        isNullable: true,
                    },
                    {
                        name: "is_active",
                        type: "boolean",
                        isNullable: false,
                        default: true,
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
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_package_user_id" ON "user_packages" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_package_status" ON "user_packages" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_package_stripe_subscription" ON "user_packages" ("stripe_subscription_id")`);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_package_active_subscription" ON "user_packages" ("user_id", "status", "is_active")`);

        // Create foreign key constraint if not exists
        const table = await queryRunner.getTable("user_packages");
        const existingForeignKey = table.foreignKeys.find(fk => 
            fk.columnNames.includes("package_id") && fk.referencedTableName === "packages"
        );
        
        if (!existingForeignKey) {
            await queryRunner.createForeignKey(
                "user_packages",
                new TableForeignKey({
                    columnNames: ["package_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "packages",
                    onDelete: "RESTRICT",
                    onUpdate: "CASCADE",
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key first
        const table = await queryRunner.getTable("user_packages");
        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("package_id") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("user_packages", foreignKey);
        }

        // Drop indexes
        await queryRunner.dropIndex("user_packages", "idx_user_package_active_subscription");
        await queryRunner.dropIndex("user_packages", "idx_user_package_stripe_subscription");
        await queryRunner.dropIndex("user_packages", "idx_user_package_status");
        await queryRunner.dropIndex("user_packages", "idx_user_package_user_id");
        
        await queryRunner.dropTable("user_packages");
    }

}

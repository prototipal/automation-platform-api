import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFreePackageForExistingUsers1755804832035 implements MigrationInterface {
    name = 'AddFreePackageForExistingUsers1755804832035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Get the free package ID (should be 1 based on the CreatePackagesTable migration)
        const freePackageResult = await queryRunner.query(`
            SELECT id FROM packages WHERE type = 'free' LIMIT 1
        `);

        if (!freePackageResult || freePackageResult.length === 0) {
            throw new Error('Free package not found. Please ensure packages are created first.');
        }

        const freePackageId = freePackageResult[0].id;

        // Get all users from user_credits who don't have any user_packages
        const usersWithoutPackages = await queryRunner.query(`
            SELECT DISTINCT uc.user_id 
            FROM user_credits uc
            LEFT JOIN user_packages up ON uc.user_id = up.user_id AND up.is_active = true
            WHERE up.user_id IS NULL
        `);

        if (usersWithoutPackages && usersWithoutPackages.length > 0) {
            console.log(`Found ${usersWithoutPackages.length} users without packages. Adding free packages...`);

            // Add free package for each user without packages
            for (const user of usersWithoutPackages) {
                await queryRunner.query(`
                    INSERT INTO user_packages (
                        user_id, 
                        package_id, 
                        status, 
                        billing_interval,
                        current_period_start,
                        current_period_end,
                        credits_used_current_period,
                        generations_current_period,
                        cancel_at_period_end,
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES (
                        $1, 
                        $2, 
                        'active',
                        NULL,
                        CURRENT_TIMESTAMP,
                        NULL,
                        0,
                        0,
                        false,
                        true,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                `, [user.user_id, freePackageId]);
            }

            console.log(`Successfully added free packages for ${usersWithoutPackages.length} users.`);
        } else {
            console.log('No users without packages found.');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Get the free package ID
        const freePackageResult = await queryRunner.query(`
            SELECT id FROM packages WHERE type = 'free' LIMIT 1
        `);

        if (freePackageResult && freePackageResult.length > 0) {
            const freePackageId = freePackageResult[0].id;
            
            // Remove all user_packages that have the free package
            await queryRunner.query(`
                DELETE FROM user_packages 
                WHERE package_id = $1 
                AND stripe_subscription_id IS NULL
                AND stripe_customer_id IS NULL
            `, [freePackageId]);
            
            console.log('Removed auto-assigned free packages for users.');
        }
    }

}

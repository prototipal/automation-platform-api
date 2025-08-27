import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePackagePricesAndCredits1756321547355 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update Basic Plan: 175 credits, $9/month, $90/year
        await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_credits = 175,
                monthly_price_cents = 900,
                yearly_price_cents = 9000,
                updated_at = NOW()
            WHERE type = 'basic'
        `);

        // Update Pro Plan: 400 credits, $19/month, $190/year  
        await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_credits = 400,
                monthly_price_cents = 1900,
                yearly_price_cents = 19000,
                updated_at = NOW()
            WHERE type = 'pro'
        `);

        // Update Ultimate Plan: 1000 credits, $49/month, $490/year
        await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_credits = 1000,
                monthly_price_cents = 4900,
                yearly_price_cents = 49000,
                updated_at = NOW()
            WHERE type = 'ultimate'
        `);

        console.log('Package credits and prices updated successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert Basic Plan to previous values (150 credits)
        await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_credits = 150,
                monthly_price_cents = 900,
                yearly_price_cents = 9000,
                updated_at = NOW()
            WHERE type = 'basic'
        `);

        // Revert Pro Plan to previous values (400 credits - unchanged)
        await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_credits = 400,
                monthly_price_cents = 1900,
                yearly_price_cents = 19000,
                updated_at = NOW()
            WHERE type = 'pro'
        `);

        // Revert Ultimate Plan to previous values (800 credits)
        await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_credits = 800,
                monthly_price_cents = 4900,
                yearly_price_cents = 49000,
                updated_at = NOW()
            WHERE type = 'ultimate'
        `);

        console.log('Package credits and prices reverted successfully');
    }

}

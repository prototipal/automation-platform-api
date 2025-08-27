import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateStripeMonthlyPriceIds1756320415854 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update Basic Plan monthly price ID
        await queryRunner.query(`
            UPDATE packages 
            SET stripe_monthly_price_id = 'price_1S0ncuCsj1z7vyBgC0WC9nQ8'
            WHERE type = 'basic'
        `);

        // Update Pro Plan monthly price ID  
        await queryRunner.query(`
            UPDATE packages 
            SET stripe_monthly_price_id = 'price_1S0nh1Csj1z7vyBgHG7lqluv'
            WHERE type = 'pro'
        `);

        // Update Ultimate Plan monthly price ID
        await queryRunner.query(`
            UPDATE packages 
            SET stripe_monthly_price_id = 'price_1S0nnaCsj1z7vyBg0P10pFDk'
            WHERE type = 'ultimate'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to previous Stripe price IDs
        await queryRunner.query(`
            UPDATE packages 
            SET stripe_monthly_price_id = 'price_1RxqXcCsj1z7vyBgUVHwDbfO'
            WHERE type = 'basic'
        `);

        await queryRunner.query(`
            UPDATE packages 
            SET stripe_monthly_price_id = 'price_1RxqZBCsj1z7vyBgPGAZdtWq'
            WHERE type = 'pro'
        `);

        await queryRunner.query(`
            UPDATE packages 
            SET stripe_monthly_price_id = 'price_1RxqaYCsj1z7vyBg2LAe77g7'
            WHERE type = 'ultimate'
        `);
    }

}

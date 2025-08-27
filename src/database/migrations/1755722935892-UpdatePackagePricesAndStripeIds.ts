import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePackagePricesAndStripeIds1755722935892
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update Basic Plan (type: 'basic')
    await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_price_cents = 900,
                yearly_price_cents = 9000,
                stripe_monthly_price_id = 'price_1S0ncuCsj1z7vyBgC0WC9nQ8',
                stripe_yearly_price_id = NULL
            WHERE type = 'basic'
        `);

    // Update Pro Plan (type: 'pro')
    await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_price_cents = 1900,
                yearly_price_cents = 19000,
                stripe_monthly_price_id = 'price_1S0nh1Csj1z7vyBgHG7lqluv',
                stripe_yearly_price_id = NULL
            WHERE type = 'pro'
        `);

    // Update Ultimate Plan (type: 'ultimate')
    await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_price_cents = 4900,
                yearly_price_cents = 49000,
                stripe_monthly_price_id = 'price_1S0nnaCsj1z7vyBg0P10pFDk',
                stripe_yearly_price_id = NULL
            WHERE type = 'ultimate'
        `);

    // Free plan remains unchanged (no Stripe price IDs needed)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original prices and remove Stripe price IDs
    await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_price_cents = 999,
                yearly_price_cents = 9999,
                stripe_monthly_price_id = NULL,
                stripe_yearly_price_id = NULL
            WHERE type = 'basic'
        `);

    await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_price_cents = 2999,
                yearly_price_cents = 29999,
                stripe_monthly_price_id = NULL,
                stripe_yearly_price_id = NULL
            WHERE type = 'pro'
        `);

    await queryRunner.query(`
            UPDATE packages 
            SET 
                monthly_price_cents = 9999,
                yearly_price_cents = 99999,
                stripe_monthly_price_id = NULL,
                stripe_yearly_price_id = NULL
            WHERE type = 'ultimate'
        `);
  }
}

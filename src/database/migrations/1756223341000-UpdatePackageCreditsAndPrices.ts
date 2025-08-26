import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePackageCreditsAndPrices1756223341000 implements MigrationInterface {
  name = 'UpdatePackageCreditsAndPrices1756223341000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update Free Plan: 0 credits, $0/month, $0/year
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 0,
        monthly_price_cents = 0,
        yearly_price_cents = 0,
        updated_at = NOW()
      WHERE type = 'free'
    `);

    // Update Basic Plan: 150 credits, $9/month, $90/year
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 150,
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

    // Update Ultimate Plan: 800 credits, $49/month, $490/year
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 800,
        monthly_price_cents = 4900,
        yearly_price_cents = 49000,
        updated_at = NOW()
      WHERE type = 'ultimate'
    `);

    console.log('Package credits and prices updated successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert Free Plan to previous values
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 100,
        monthly_price_cents = 0,
        yearly_price_cents = 0,
        updated_at = NOW()
      WHERE type = 'free'
    `);

    // Revert Basic Plan to previous values
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 500,
        monthly_price_cents = 999,
        yearly_price_cents = 9999,
        updated_at = NOW()
      WHERE type = 'basic'
    `);

    // Revert Pro Plan to previous values
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 2000,
        monthly_price_cents = 2999,
        yearly_price_cents = 29999,
        updated_at = NOW()
      WHERE type = 'pro'
    `);

    // Revert Ultimate Plan to previous values
    await queryRunner.query(`
      UPDATE packages 
      SET 
        monthly_credits = 10000,
        monthly_price_cents = 9999,
        yearly_price_cents = 99999,
        updated_at = NOW()
      WHERE type = 'ultimate'
    `);

    console.log('Package credits and prices reverted successfully');
  }
}
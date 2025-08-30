import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFreePackageCredits1756576013000 implements MigrationInterface {
  name = 'UpdateFreePackageCredits1756576013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE packages 
      SET monthly_credits = 5, 
          description = 'Get started with basic features - 5 free credits to explore our platform'
      WHERE type = 'free'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE packages 
      SET monthly_credits = 100,
          description = 'Get started with basic features'
      WHERE type = 'free'
    `);
  }
}
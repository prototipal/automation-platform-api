import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestUser1755723271174 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skip test user creation if users table doesn't exist
    const hasUsersTable = await queryRunner.hasTable('users');
    
    if (hasUsersTable) {
      // Create test user for development
      await queryRunner.query(`
              INSERT INTO users (id, email, created_at, updated_at) 
              VALUES (
                  '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
                  'test@example.com',
                  NOW(),
                  NOW()
              )
              ON CONFLICT (id) DO NOTHING
          `);

      // Check if user_packages table exists and assign free package to test user
      const hasUserPackagesTable = await queryRunner.hasTable('user_packages');
      const hasPackagesTable = await queryRunner.hasTable('packages');
      
      if (hasUserPackagesTable && hasPackagesTable) {
        await queryRunner.query(`
                INSERT INTO user_packages (user_id, package_id, status, is_active, created_at, updated_at)
                SELECT 
                    '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
                    p.id,
                    'active',
                    true,
                    NOW(),
                    NOW()
                FROM packages p 
                WHERE p.type = 'free'
                AND NOT EXISTS (
                    SELECT 1 FROM user_packages up 
                    WHERE up.user_id = '33653324-7e1d-4e6b-a46c-5f9997ec12ec'
                )
            `);
      }
    } else {
      console.log('Skipping test user creation: users table does not exist');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only attempt cleanup if tables exist
    const hasUserPackagesTable = await queryRunner.hasTable('user_packages');
    const hasUsersTable = await queryRunner.hasTable('users');
    
    if (hasUserPackagesTable) {
      // Remove test user package
      await queryRunner.query(`
              DELETE FROM user_packages 
              WHERE user_id = '33653324-7e1d-4e6b-a46c-5f9997ec12ec'
          `);
    }

    if (hasUsersTable) {
      // Remove test user
      await queryRunner.query(`
              DELETE FROM users 
              WHERE id = '33653324-7e1d-4e6b-a46c-5f9997ec12ec'
          `);
    }
  }
}

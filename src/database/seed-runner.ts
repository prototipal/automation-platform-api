import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Service } from '@/modules/services/entities';
import { ServicesSeed } from './seeds';

config();

// TypeORM configuration for seeding
const createDataSource = (): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'automation_platform',
    entities: [Service],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
};

async function runSeeds() {
  console.log('🚀 Starting database seeding...');

  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('📦 Database connection established');

    // Run seeds
    await ServicesSeed.run(dataSource);

    console.log('✨ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔒 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds };

# PostgreSQL Database Setup for NestJS

## Overview

This NestJS application has been configured with PostgreSQL database integration using TypeORM. The setup includes comprehensive configuration management, error handling, health checks, and connection validation.

## Setup Instructions

### 1. Environment Configuration

1. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your PostgreSQL connection details:
   ```bash
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_postgres_username
   DB_PASSWORD=your_postgres_password
   DB_NAME=automation_platform
   DB_SSL=false
   DB_CONNECTION_LIMIT=10
   ```

### 2. PostgreSQL Database Setup

1. Install PostgreSQL on your system if not already installed
2. Create a database:
   ```sql
   CREATE DATABASE automation_platform;
   ```
3. Create a user (optional, you can use existing postgres user):
   ```sql
   CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE automation_platform TO your_username;
   ```

### 3. Install Dependencies

All necessary dependencies have been installed:
- `@nestjs/typeorm` - NestJS TypeORM integration
- `@nestjs/config` - Configuration management
- `@nestjs/terminus` - Health checks
- `typeorm` - TypeORM ORM
- `pg` - PostgreSQL driver
- `class-validator` & `class-transformer` - Validation and transformation
- `joi` - Configuration validation

### 4. Application Structure

```
src/
├── config/
│   ├── app.config.ts           # Application configuration
│   ├── database.config.ts      # Database configuration
│   ├── configuration.ts        # Configuration validation schema
│   └── index.ts               # Configuration exports
├── database/
│   ├── database.module.ts      # Database module setup
│   └── index.ts
├── common/
│   ├── exceptions/
│   │   ├── database.exception.ts  # Custom database exceptions
│   │   └── index.ts
│   ├── filters/
│   │   ├── all-exceptions.filter.ts      # Global exception filter
│   │   ├── database-exception.filter.ts  # Database-specific exception filter
│   │   └── index.ts
│   └── index.ts
├── health/
│   ├── health.controller.ts    # Health check endpoints
│   ├── health.module.ts       # Health check module
│   └── index.ts
├── modules/
│   └── example/
│       └── example.entity.ts   # Sample entity
├── app.module.ts              # Main application module
└── main.ts                   # Application bootstrap
```

## Features Implemented

### 1. Configuration Management
- **Environment-based configuration** with validation using Joi
- **Type-safe configuration** access throughout the application
- **Separate configurations** for app and database settings

### 2. Database Connection
- **PostgreSQL connection** with TypeORM
- **Connection pooling** with configurable limits
- **SSL support** for production environments
- **Automatic entity loading** and migration support
- **Connection retry logic** with configurable attempts and delays

### 3. Error Handling
- **Global exception filters** for consistent error responses
- **Database-specific error handling** with PostgreSQL error code mapping
- **Proper HTTP status codes** for different error types
- **Comprehensive logging** for debugging

### 4. Health Checks
- **Database health endpoint** at `/api/health/database`
- **General health endpoint** at `/api/health`
- **Connection timeout handling** for reliable health monitoring

### 5. Validation & Security
- **Global validation pipes** with automatic transformation
- **Input sanitization** and whitelisting
- **CORS enabled** for cross-origin requests
- **Global API prefix** configuration

## Usage Examples

### 1. Creating an Entity

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
```

### 2. Creating a Repository Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOneBy({ id });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }
}
```

### 3. Module Configuration

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

## Running the Application

1. **Development mode**:
   ```bash
   npm run start:dev
   ```

2. **Production mode**:
   ```bash
   npm run build
   npm run start:prod
   ```

3. **Check health**:
   - General health: `GET http://localhost:3000/api/health`
   - Database health: `GET http://localhost:3000/api/health/database`

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production/test) | `development` | No |
| `PORT` | Application port | `3000` | No |
| `GLOBAL_PREFIX` | API prefix | `api` | No |
| `DB_HOST` | PostgreSQL host | `localhost` | No |
| `DB_PORT` | PostgreSQL port | `5432` | No |
| `DB_USERNAME` | Database username | - | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_NAME` | Database name | - | Yes |
| `DB_SSL` | Enable SSL connection | `false` | No |
| `DB_CONNECTION_LIMIT` | Connection pool limit | `10` | No |

## Error Handling

The application includes comprehensive error handling:

- **Database connection errors** return HTTP 503 (Service Unavailable)
- **Validation errors** return HTTP 400 (Bad Request)
- **Entity not found errors** return HTTP 404 (Not Found)
- **Database constraint violations** return appropriate HTTP status codes
- All errors include timestamps, request paths, and descriptive messages

## Security Considerations

- Environment variables are properly validated
- Database credentials are never logged
- SQL injection protection through TypeORM
- Input validation and sanitization
- SSL support for production databases
- Connection pooling prevents connection exhaustion

## Next Steps

1. **Add your entities** in the `src/modules/` directory
2. **Create database migrations** for schema changes
3. **Implement your business logic** with services and controllers
4. **Add authentication** and authorization as needed
5. **Configure logging** for production monitoring

This setup provides a solid foundation for a scalable NestJS application with PostgreSQL database integration.
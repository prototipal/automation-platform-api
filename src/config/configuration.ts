import { ConfigModuleOptions } from '@nestjs/config';
import * as Joi from 'joi';
import appConfig from './app.config';
import databaseConfig from './database.config';
import supabaseConfig from './supabase.config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [appConfig, databaseConfig, supabaseConfig],
  validationSchema: Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .default('development'),
    PORT: Joi.number().port().default(3000),

    // Database configuration validation
    DB_HOST: Joi.string().default('localhost'),
    DB_PORT: Joi.number().port().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_SSL: Joi.string().valid('true', 'false').default('false'),
    DB_CONNECTION_LIMIT: Joi.number().min(1).max(100).default(10),

    GLOBAL_PREFIX: Joi.string().default('api'),

    // Replicate API configuration validation
    REPLICATE_API_TOKEN: Joi.string().required(),
    REPLICATE_WEBHOOK_SECRET: Joi.string().optional(),
    WEBHOOK_BASE_URL: Joi.string().uri().optional(),
    WEBHOOK_DEV_URL: Joi.string().uri().optional(), // For development testing with ngrok

    // Authentication configuration validation
    STATIC_AUTH_TOKEN: Joi.string().required(),

    // Pricing configuration validation
    PROFIT_MARGIN: Joi.number().min(1.0).max(5.0).default(1.5),
    CREDIT_VALUE_USD: Joi.number().min(0.001).max(1.0).default(0.05),

    // Supabase configuration validation
    SUPABASE_URL: Joi.string().uri().required(),
    SUPABASE_ANON_KEY: Joi.string().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    SUPABASE_BUCKET_NAME: Joi.string().default('generations'),
    SUPABASE_MAX_FILE_SIZE_MB: Joi.number().min(1).max(100).default(10),

    // Stripe configuration validation
    STRIPE_SECRET_KEY: Joi.string().required(),
    STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
    STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  }),
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
};

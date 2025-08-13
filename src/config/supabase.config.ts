import { registerAs } from '@nestjs/config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  bucketName: string;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}

export default registerAs('supabase', (): SupabaseConfig => {
  const config: SupabaseConfig = {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucketName: process.env.SUPABASE_BUCKET_NAME || 'generations',
    maxFileSizeBytes: parseInt(process.env.SUPABASE_MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/mov',
      'video/avi',
    ],
  };

  // Validate required environment variables
  if (!config.url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!config.anonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }

  if (!config.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return config;
});
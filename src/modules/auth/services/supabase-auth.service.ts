import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { AuthUserDto } from '@/modules/auth/dto';
import {
  InvalidSupabaseTokenException,
  SupabaseUserNotFoundException,
  UserNotFoundException,
  InactiveUserException,
} from '@/modules/auth/exceptions';

@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Validates Supabase JWT token and returns user information with credits
   */
  async validateSupabaseToken(token: string): Promise<AuthUserDto> {
    try {
      this.logger.log(`Validating Supabase token: ${token.substring(0, 20)}...`);

      // Verify JWT token with Supabase
      const { data: tokenData, error: tokenError } = await this.supabase.auth.getUser(token);

      if (tokenError || !tokenData?.user) {
        this.logger.warn(`Invalid Supabase token: ${tokenError?.message || 'Token verification failed'}`);
        throw new InvalidSupabaseTokenException();
      }

      const supabaseUserId = tokenData.user.id;
      const userEmail = tokenData.user.email;

      this.logger.log(`Supabase token verified for user: ${supabaseUserId}`);

      // Get user credits and profile using the Supabase user ID
      const userDataResult = await this.dataSource.query(
        `SELECT 
           uc.user_id,
           uc.balance,
           up.email,
           up.full_name as name,
           CASE WHEN up.id IS NOT NULL THEN true ELSE false END as user_active
         FROM user_credits uc
         LEFT JOIN user_profiles up ON uc.user_id = up.id
         WHERE uc.user_id = $1`,
        [supabaseUserId],
      );

      if (!userDataResult || userDataResult.length === 0) {
        this.logger.warn(`User not found in our database for Supabase user_id: ${supabaseUserId}`);
        throw new SupabaseUserNotFoundException();
      }

      const userData = userDataResult[0];
      if (!userData.user_active) {
        this.logger.warn(`Inactive user: ${supabaseUserId}`);
        throw new InactiveUserException();
      }

      this.logger.log(`Supabase token validated successfully for user: ${supabaseUserId}`);
      
      return plainToInstance(AuthUserDto, {
        user_id: userData.user_id,
        balance: parseFloat(userData.balance),
        email: userData.email || userEmail, // Fallback to Supabase email if not in our DB
        name: userData.name,
      });
    } catch (error) {
      if (error instanceof InvalidSupabaseTokenException || 
          error instanceof SupabaseUserNotFoundException || 
          error instanceof InactiveUserException) {
        throw error;
      }

      this.logger.error(`Unexpected error during Supabase token validation:`, error);
      throw new InvalidSupabaseTokenException();
    }
  }

  /**
   * Determines if a token is likely a Supabase JWT (vs API key)
   */
  isSupabaseToken(token: string): boolean {
    // JWT tokens have 3 parts separated by dots
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Additional check: JWT tokens are typically much longer than API keys
    // API keys in this system might start with specific prefix, JWTs don't
    return token.length > 100; // JWTs are typically 200+ chars
  }
}
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

export class InvalidApiKeyException extends UnauthorizedException {
  constructor(message = 'Invalid API key') {
    super(message);
  }
}

export class ApiKeyNotFoundException extends UnauthorizedException {
  constructor(message = 'API key not found') {
    super(message);
  }
}

export class InactiveApiKeyException extends UnauthorizedException {
  constructor(message = 'API key is inactive') {
    super(message);
  }
}

export class InvalidStaticTokenException extends UnauthorizedException {
  constructor(message = 'Invalid static token') {
    super(message);
  }
}

export class InsufficientCreditsException extends ForbiddenException {
  constructor(message = 'Insufficient credits') {
    super(message);
  }
}

export class UserNotFoundException extends UnauthorizedException {
  constructor(message = 'User not found') {
    super(message);
  }
}

export class InactiveUserException extends ForbiddenException {
  constructor(message = 'User account is inactive') {
    super(message);
  }
}

export class CreditDeductionFailedException extends BadRequestException {
  constructor(message = 'Failed to deduct credits') {
    super(message);
  }
}

export class InvalidSupabaseTokenException extends UnauthorizedException {
  constructor(message = 'Invalid Supabase token') {
    super(message);
  }
}

export class SupabaseUserNotFoundException extends UnauthorizedException {
  constructor(message = 'User not found in system. Please ensure your account is properly set up.') {
    super(message);
  }
}
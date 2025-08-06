import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserDto } from '@/modules/auth/dto';

export const AuthUser = createParamDecorator(
  (data: keyof AuthUserDto | undefined, ctx: ExecutionContext): AuthUserDto | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUserDto;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
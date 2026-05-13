import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUserContext } from './types';

/**
 * JwtAuthGuard 가 request.user 에 채워둔 사용자 컨텍스트를 추출.
 * 사용 예: `apply(@CurrentUser() user: CurrentUserContext) { ... }`
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentUserContext;
  },
);

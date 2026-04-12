import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { getIp } from 'src/utils/ip.util';

export const Ip = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  return getIp(request);
});

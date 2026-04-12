import { Request } from 'express';

export function getIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] ?? request.ip ?? request.socket?.remoteAddress ?? '';
  }
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.ip ?? request.socket?.remoteAddress ?? '';
}

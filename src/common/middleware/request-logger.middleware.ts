import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { appendFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

const logger = new Logger('HTTP');

const resolveLogPath = (): string => {
  const envPath = process.env.REQUEST_LOG_PATH?.trim();
  if (envPath) {
    return envPath;
  }
  return join(process.cwd(), 'logs', 'requests.log');
};

let logPath: string | null = null;
let logDirReady: Promise<void> | null = null;

const ensureLogDir = (path: string) => {
  if (logPath !== path || !logDirReady) {
    logPath = path;
    logDirReady = mkdir(dirname(path), { recursive: true }).then(() => undefined);
  }
  return logDirReady;
};

const formatBytes = (value: number | string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '0';
  }
  if (value === undefined) {
    return '0';
  }
  return String(value);
};

export const requestLogger =
  () => (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const method = req.method;
      const url = req.originalUrl ?? req.url;
      const status = res.statusCode;
      const contentLength = formatBytes(res.getHeader('content-length'));
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
      const userAgent = req.get('user-agent') ?? '-';
      const line = `${new Date().toISOString()} ${method} ${url} ${status} ${durationMs.toFixed(
        1,
      )}ms ${contentLength}b ${ip} "${userAgent}"`;

      logger.log(line);

      const path = resolveLogPath();
      ensureLogDir(path)
        .then(() => appendFile(path, `${line}\n`, 'utf8'))
        .catch((error) => {
          logger.error(`Failed to write request log: ${error?.message ?? error}`);
        });
    });

    next();
  };

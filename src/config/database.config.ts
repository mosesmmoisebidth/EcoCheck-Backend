import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { envToBool, envToNumber, readEnvValue } from 'src/utils/env.util';

export function databaseConfig(): TypeOrmModuleOptions {
  const url = readEnvValue(process.env.TYPEORM_URL);
  const type = (readEnvValue(process.env.TYPEORM_CONNECTION) ?? 'postgres') as 'postgres';
  const synchronize = envToBool(process.env.TYPEORM_SYNCHRONIZE, false);
  const logging = envToBool(process.env.TYPEORM_LOGGING, false);
  const autoLoadEntities = envToBool(process.env.TYPEORM_AUTOLOAD, true);
  const sslEnabled = envToBool(process.env.TYPEORM_SSL, false);
  const sslRejectUnauthorized = envToBool(
    process.env.TYPEORM_SSL_REJECT_UNAUTHORIZED,
    true,
  );

  const baseConfig: TypeOrmModuleOptions = {
    type,
    autoLoadEntities,
    synchronize,
    logging,
    ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
  };

  if (url) {
    return {
      ...baseConfig,
      url,
    };
  }

  return {
    ...baseConfig,
    host: readEnvValue(process.env.DB_HOST) ?? 'localhost',
    port: envToNumber(process.env.DB_PORT, 5432),
    username: readEnvValue(process.env.DB_USER) ?? 'postgres',
    password: readEnvValue(process.env.DB_PASSWORD) ?? '',
    database: readEnvValue(process.env.DB_NAME) ?? 'pis',
  };
}

import dotenv from 'dotenv';
import path from 'path';

const baseEnv = path.resolve(process.cwd(), '.env');
const localEnv = path.resolve(process.cwd(), '.env.local');

dotenv.config({ path: baseEnv });
dotenv.config({ path: localEnv, override: true });

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  if (value.toLowerCase() === 'true') {
    return true;
  }
  if (value.toLowerCase() === 'false') {
    return false;
  }
  return fallback;
};

export const config = {
  port: num(process.env.PORT, 8090),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/youscore',
  databaseSSL: bool(process.env.DATABASE_SSL, false),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  deviceLimit: num(process.env.DEVICE_LIMIT, 2),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@protips.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  forceAdminSync: bool(process.env.FORCE_ADMIN_SYNC, false),
};

import fs from 'fs';
import path from 'path';
import { pool } from './db';

export const runMigrations = async () => {
  const schemaPath = path.resolve(process.cwd(), 'sql/schema.sql');
  const sql = await fs.promises.readFile(schemaPath, 'utf-8');
  await pool.query(sql);
};

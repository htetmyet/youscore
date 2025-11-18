import { app } from './app';
import { config } from './config';
import { pool } from './db';
import { ensureAdminUser } from './services/userService';
import { runMigrations } from './schema';

const start = async () => {
  try {
    await pool.query('SELECT 1');
    await runMigrations();
    await ensureAdminUser();
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`API server listening on port ${config.port}`);
      process.stdout.write('');
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();

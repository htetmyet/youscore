import { pool } from '../db';
import { AppSettings } from '../types';

const SETTINGS_ID = 1;

interface LeagueRow {
  name: string;
  logo_url: string | null;
}

export const getSettings = async (): Promise<AppSettings> => {
  const settingsResult = await pool.query(`SELECT * FROM app_settings WHERE id = $1`, [SETTINGS_ID]);
  const leaguesResult = await pool.query<LeagueRow>(
    `SELECT name, logo_url FROM supported_leagues WHERE settings_id = $1 ORDER BY position ASC`,
    [SETTINGS_ID]
  );
  const row = settingsResult.rows[0] ?? { page_title: 'ProTips Football Predictor', logo_url: null };
  return {
    pageTitle: row.page_title,
    logoUrl: row.logo_url ?? null,
    supportedLeagues: leaguesResult.rows.map((league) => ({
      name: league.name,
      logoUrl: league.logo_url ?? '',
    })),
  };
};

export const updateSettings = async (partial: Partial<AppSettings>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sets: string[] = [];
    const values: any[] = [];
    if (partial.pageTitle !== undefined) {
      sets.push(`page_title = $${values.length + 1}`);
      values.push(partial.pageTitle);
    }
    if (partial.logoUrl !== undefined) {
      sets.push(`logo_url = $${values.length + 1}`);
      values.push(partial.logoUrl);
    }
    if (sets.length) {
      await client.query(`UPDATE app_settings SET ${sets.join(', ')} WHERE id = $${values.length + 1}`, [...values, SETTINGS_ID]);
    }
    if (partial.supportedLeagues) {
      await client.query(`DELETE FROM supported_leagues WHERE settings_id = $1`, [SETTINGS_ID]);
      for (let i = 0; i < partial.supportedLeagues.length; i++) {
        const league = partial.supportedLeagues[i];
        await client.query(
          `INSERT INTO supported_leagues (settings_id, name, logo_url, position)
           VALUES ($1, $2, $3, $4)`,
          [SETTINGS_ID, league.name, league.logoUrl, i]
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getSettings();
};

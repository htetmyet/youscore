import { pool } from '../db';
import { AppSettings, LandingSections } from '../types';

const SETTINGS_ID = 1;

const defaultLandingSections: LandingSections = {
  heroTagline: 'PREMIUM FOOTBALL INTELLIGENCE',
  heroSubtitle: 'Verified bilingual analysts deliver context-rich alerts, bankroll guidance, and audited slips for every slate.',
  primaryCta: 'Get Instant Access',
  secondaryCta: 'Already have access? Log in',
  stats: [
    { label: 'Average Monthly ROI', value: '+126%', detail: 'Derived from verified member slips' },
    { label: 'Games Covered Weekly', value: '48+', detail: 'Top European & ASEAN leagues' },
    { label: 'Active Community', value: '3,500+', detail: 'Subscribers, partners, and syndicates' },
  ],
  credibility: [
    { title: 'Elite Analyst Desk', description: 'Former traders, scouts, and data scientists working together as one tactical desk.' },
    { title: 'Verified Track Record', description: 'Every pick is timestamped and auditable from inside your dashboard archive.' },
    { title: 'Concierge-Level Support', description: 'Burmese + English concierge to help with staking plans and bankroll discipline.' },
  ],
  testimonials: [
    { quote: 'The Tuesday briefings alone cover my subscription. Their reason codes are priceless.', author: 'Kelvin A.', role: 'VIP Member • Kuala Lumpur' },
    { quote: 'I finally feel confident increasing my stake sizes—the transparency is the best I have seen.', author: 'May Thu', role: 'Premium Member • Yangon' },
    { quote: 'We run a private betting club and ProTips is the only service we trust with our syndicate.', author: 'Victory Club Syndicate', role: 'Regional Partner' },
  ],
};

const parseLandingSections = (raw: any): LandingSections => {
  const stats = Array.isArray(raw?.stats) ? raw.stats.filter((item: any) => item && typeof item.label === 'string').map((item: any) => ({
    label: item.label ?? '',
    value: item.value ?? '',
    detail: item.detail ?? '',
  })) : defaultLandingSections.stats;

  const credibility = Array.isArray(raw?.credibility) ? raw.credibility.filter((item: any) => item && typeof item.title === 'string').map((item: any) => ({
    title: item.title ?? '',
    description: item.description ?? '',
  })) : defaultLandingSections.credibility;

  const testimonials = Array.isArray(raw?.testimonials) ? raw.testimonials.filter((item: any) => item && typeof item.quote === 'string').map((item: any) => ({
    quote: item.quote ?? '',
    author: item.author ?? '',
    role: item.role ?? '',
  })) : defaultLandingSections.testimonials;

  return {
    heroTagline: typeof raw?.heroTagline === 'string' && raw.heroTagline.trim() ? raw.heroTagline : defaultLandingSections.heroTagline,
    heroSubtitle: typeof raw?.heroSubtitle === 'string' && raw.heroSubtitle.trim() ? raw.heroSubtitle : defaultLandingSections.heroSubtitle,
    primaryCta: typeof raw?.primaryCta === 'string' && raw.primaryCta.trim() ? raw.primaryCta : defaultLandingSections.primaryCta,
    secondaryCta: typeof raw?.secondaryCta === 'string' && raw.secondaryCta.trim() ? raw.secondaryCta : defaultLandingSections.secondaryCta,
    stats: stats.length ? stats : defaultLandingSections.stats,
    credibility: credibility.length ? credibility : defaultLandingSections.credibility,
    testimonials: testimonials.length ? testimonials : defaultLandingSections.testimonials,
  };
};

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
    landingSections: parseLandingSections(row.landing_sections),
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
    if (partial.landingSections !== undefined) {
      sets.push(`landing_sections = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(partial.landingSections));
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

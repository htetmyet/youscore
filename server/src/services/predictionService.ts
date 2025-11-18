import { randomUUID } from 'crypto';
import { pool } from '../db';
import { Prediction, PredictionResult, WeeklyStat } from '../types';
import { createNotification } from './notificationService';
import { getDateOfISOWeek, getISOWeekRange, getSegmentType, getWeekIdentifier } from '../utils/dates';

interface PredictionRow {
  id: string;
  match_date: Date;
  league: string;
  match: string;
  tip: string;
  odds: number;
  result: PredictionResult;
  prediction_type: 'big' | 'small';
  confidence: number | null;
  recommended_stake: number | null;
  prob_max: number | null;
  final_score: string | null;
}

const mapPredictionRow = (row: PredictionRow): Prediction => ({
  id: row.id,
  date: row.match_date.toISOString(),
  league: row.league,
  match: row.match,
  tip: row.tip,
  odds: Number(row.odds),
  result: row.result,
  type: row.prediction_type,
  confidence: row.confidence ?? undefined,
  recommendedStake: row.recommended_stake ?? undefined,
  probMax: row.prob_max !== null && row.prob_max !== undefined ? Number(row.prob_max) : undefined,
  finalScore: row.final_score ?? undefined,
});

const calculateRecommendedStake = (confidence?: number | null) => {
  if (confidence === null || confidence === undefined) return 1;
  if (confidence >= 80) return 3;
  if (confidence >= 60) return 2;
  return 1;
};

const notifyActiveUsers = async () => {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM users WHERE subscription_status = 'active'`);
  await Promise.all(
    rows.map((row) =>
      createNotification(row.id, 'new_predictions', 'New predictions have been added for the upcoming matches!')
    )
  );
};

const calculateSegmentExpiry = (segment: 'mid-week' | 'weekend') => {
  const now = new Date();
  const nextWeekAnchor = new Date(now);
  nextWeekAnchor.setDate(now.getDate() + 7);
  const expiry = new Date(nextWeekAnchor);
  if (segment === 'mid-week') {
    const day = expiry.getUTCDay();
    const daysUntilThursday = (4 - day + 7) % 7;
    expiry.setUTCDate(expiry.getUTCDate() + daysUntilThursday);
  } else {
    const day = expiry.getUTCDay();
    const daysUntilSunday = day === 0 ? 7 : (7 - day);
    expiry.setUTCDate(expiry.getUTCDate() + daysUntilSunday);
  }
  expiry.setUTCHours(23, 59, 59, 999);
  return expiry;
};

const handleFreeSegmentGuarantee = async (predictionDate: Date) => {
  const segment = getSegmentType(predictionDate);
  const { start, end } = getISOWeekRange(predictionDate);
  const { rows } = await pool.query<PredictionRow>(
    `SELECT * FROM predictions WHERE match_date >= $1 AND match_date < $2`,
    [start.toISOString(), end.toISOString()]
  );
  const predictions = rows
    .map(mapPredictionRow)
    .filter((p) => getSegmentType(new Date(p.date)) === segment);
  if (!predictions.length) {
    return;
  }
  const isSegmentComplete = predictions.every((p) => p.result !== 'Pending');
  if (!isSegmentComplete) {
    return;
  }
  const stats = predictions.reduce<{ winCount: number; lossCount: number; returnCount: number }>(
    (acc, p) => {
      if (p.result === 'Won') acc.winCount += 1;
      else if (p.result === 'Loss') acc.lossCount += 1;
      else if (p.result === 'Return') acc.returnCount += 1;
      return acc;
    },
    { winCount: 0, lossCount: 0, returnCount: 0 }
  );
  if (stats.winCount === 0 && stats.lossCount === 0 && stats.returnCount > 0) {
    const expiry = calculateSegmentExpiry(segment).toISOString();
    await pool.query(
      `UPDATE users
       SET free_access_mid_week = CASE WHEN $1 = 'mid-week' THEN $2 ELSE free_access_mid_week END,
           free_access_weekend = CASE WHEN $1 = 'weekend' THEN $2 ELSE free_access_weekend END,
           updated_at = NOW()
       WHERE role = 'user'`,
      [segment, expiry]
    );
  }
};

export const addPredictions = async (predictions: Omit<Prediction, 'id'>[]) => {
  for (const prediction of predictions) {
    await pool.query(
      `INSERT INTO predictions (
        id, match_date, league, match, tip, odds, result, prediction_type,
        confidence, recommended_stake, prob_max, final_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12
      )`,
      [
        randomUUID(),
        prediction.date,
        prediction.league,
        prediction.match,
        prediction.tip,
        prediction.odds,
        prediction.result ?? 'Pending',
        prediction.type,
        prediction.confidence ?? null,
        prediction.recommendedStake ?? calculateRecommendedStake(prediction.confidence),
        prediction.probMax ?? null,
        prediction.finalScore ?? null,
      ]
    );
  }
  await notifyActiveUsers();
};

export const fetchPredictions = async (status: 'pending' | 'history') => {
  const clause = status === 'pending' ? `WHERE result = 'Pending'` : `WHERE result <> 'Pending'`;
  const order = status === 'pending' ? 'ASC' : 'DESC';
  const { rows } = await pool.query<PredictionRow>(`SELECT * FROM predictions ${clause} ORDER BY match_date ${order}`);
  return rows.map(mapPredictionRow);
};

export const updatePredictionResult = async (
  predictionId: string,
  result: PredictionResult,
  finalScore?: string
) => {
  const { rows } = await pool.query<PredictionRow>(
    `UPDATE predictions
     SET result = $2,
         final_score = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [predictionId, result, finalScore ?? null]
  );
  if (!rows[0]) {
    return null;
  }
  await handleFreeSegmentGuarantee(new Date(rows[0].match_date));
  return mapPredictionRow(rows[0]);
};

export const deletePrediction = async (predictionId: string) => {
  const result = await pool.query(`DELETE FROM predictions WHERE id = $1`, [predictionId]);
  const deletedCount = result.rowCount ?? 0;
  return deletedCount > 0;
};

export const fetchWeeklyStats = async (): Promise<WeeklyStat[]> => {
  const { rows } = await pool.query<PredictionRow>(`SELECT * FROM predictions WHERE result <> 'Pending'`);
  const history = rows.map(mapPredictionRow);
  const weeklyGroups: Record<string, Prediction[]> = {};
  history.forEach((prediction: Prediction) => {
    const weekId = getWeekIdentifier(new Date(prediction.date));
    if (!weeklyGroups[weekId]) {
      weeklyGroups[weekId] = [];
    }
    weeklyGroups[weekId].push(prediction);
  });

  const stats: WeeklyStat[] = Object.entries(weeklyGroups).map(([weekId, predictions]): WeeklyStat => {
    let totalStaked = 0;
    let totalReturned = 0;
    let winCount = 0;
    let lossCount = 0;
    let returnCount = 0;

    predictions.forEach((prediction: Prediction) => {
      const stake = prediction.recommendedStake ?? 1;
      totalStaked += stake;
      if (prediction.result === 'Won') {
        totalReturned += stake * prediction.odds;
        winCount += 1;
      } else if (prediction.result === 'Loss') {
        lossCount += 1;
      } else if (prediction.result === 'Return') {
        totalReturned += stake;
        returnCount += 1;
      }
    });

    const profitOrLoss = totalReturned - totalStaked;
    const roi = totalStaked > 0 ? (profitOrLoss / totalStaked) * 100 : 0;
    const [year, weekNumber] = weekId.split('-W').map(Number);
    const startDate = getDateOfISOWeek(weekNumber, year);
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);

    return {
      weekIdentifier: weekId,
      totalStaked,
      totalReturned,
      profitOrLoss,
      roi,
      winCount,
      lossCount,
      returnCount,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  });

  stats.sort((a, b) => b.weekIdentifier.localeCompare(a.weekIdentifier));
  return stats;
};

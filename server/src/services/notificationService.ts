import { randomUUID } from 'crypto';
import { pool } from '../db';
import { Notification, NotificationType } from '../types';

const mapNotificationRow = (row: any): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  message: row.message,
  timestamp: row.timestamp.toISOString(),
  isRead: row.is_read,
});

export const createNotification = async (userId: string, type: NotificationType, message: string) => {
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, message) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, type, message]
  );
};

const EXPIRY_WINDOW_DAYS = 3;

const checkAndCreateExpiringNotification = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT subscription_expiry FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0] || !rows[0].subscription_expiry) {
    return;
  }
  const expiry = new Date(rows[0].subscription_expiry);
  const now = new Date();
  const window = new Date(now);
  window.setDate(window.getDate() + EXPIRY_WINDOW_DAYS);

  if (expiry <= now || expiry > window) {
    return;
  }

  const recent = await pool.query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1
       AND type = 'subscription_expiring'
       AND timestamp > NOW() - INTERVAL '3 days'
     LIMIT 1`,
    [userId]
  );
  if (recent.rowCount) {
    return;
  }

  const formatted = expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  await createNotification(
    userId,
    'subscription_expiring',
    `Your subscription is expiring soon on ${formatted}. Renew now to maintain access.`
  );
};

export const listNotifications = async (userId: string) => {
  await checkAndCreateExpiringNotification(userId);
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY timestamp DESC`,
    [userId]
  );
  return rows.map(mapNotificationRow);
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`,
    [notificationId]
  );
  return rows[0] ? mapNotificationRow(rows[0]) : null;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [userId]);
  return listNotifications(userId);
};

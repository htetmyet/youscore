import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { pool } from '../db';
import { config } from '../config';
import { Subscription, SubscriptionPlan, SubscriptionStatus, User } from '../types';
import { createNotification } from './notificationService';

const baseUserQuery = `
  SELECT
    u.id,
    u.email,
    u.password_hash,
    u.role,
    u.subscription_plan,
    u.subscription_status,
    u.subscription_start,
    u.subscription_expiry,
    u.payment_screenshot,
    u.free_access_mid_week,
    u.free_access_weekend,
    COALESCE(json_agg(d.device_id) FILTER (WHERE d.device_id IS NOT NULL), '[]') AS devices
  FROM users u
  LEFT JOIN user_devices d ON d.user_id = u.id
`;

const parseDevices = (value: any): string[] => {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
};

const mapUserRow = (row: any): User => {
  const devices = parseDevices(row.devices);
  const freeAccess = row.free_access_mid_week || row.free_access_weekend ? {
    midWeekExpires: row.free_access_mid_week ? new Date(row.free_access_mid_week).toISOString() : undefined,
    weekendExpires: row.free_access_weekend ? new Date(row.free_access_weekend).toISOString() : undefined,
  } : undefined;

  return {
    id: row.id,
    email: row.email,
    passwordHash: 'protected',
    role: row.role,
    subscription: {
      plan: row.subscription_plan,
      status: row.subscription_status,
      startDate: row.subscription_start ? new Date(row.subscription_start).toISOString() : null,
      expiryDate: row.subscription_expiry ? new Date(row.subscription_expiry).toISOString() : null,
      paymentScreenshot: row.payment_screenshot ?? null,
    },
    devices,
    freeAccess,
  };
};

const refreshExpiredSubscriptions = async (userId?: string) => {
  const params: any[] = [];
  let suffix = '';
  if (userId) {
    params.push(userId);
    suffix = 'AND id = $1';
  }
  await pool.query(
    `UPDATE users
     SET subscription_status = 'expired', updated_at = NOW()
     WHERE subscription_status = 'active'
       AND subscription_expiry IS NOT NULL
       AND subscription_expiry < NOW()
       ${suffix}`,
    params
  );
};

export const getAllUsers = async () => {
  await refreshExpiredSubscriptions();
  const { rows } = await pool.query(`${baseUserQuery} GROUP BY u.id ORDER BY u.created_at ASC`);
  return rows.map(mapUserRow);
};

export const getUserById = async (userId: string) => {
  await refreshExpiredSubscriptions(userId);
  const { rows } = await pool.query(
    `${baseUserQuery} WHERE u.id = $1 GROUP BY u.id`,
    [userId]
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
};

const getUserRowByEmail = async (email: string) => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
  return rows[0] ?? null;
};

export const getUserByEmail = async (email: string) => {
  const row = await getUserRowByEmail(email);
  return row ? getUserById(row.id) : null;
};

export const getUserCredentialsByEmail = async (email: string) => getUserRowByEmail(email);

export const ensureAdminUser = async () => {
  const normalizedEmail = config.adminEmail.toLowerCase();
  const hash = await bcrypt.hash(config.adminPassword, 10);
  const existingByEmail = await getUserRowByEmail(normalizedEmail);

  if (existingByEmail) {
    if (config.forceAdminSync) {
      await pool.query(
        `UPDATE users
         SET password_hash = $2,
             role = 'admin',
             subscription_plan = 'none',
             subscription_status = 'inactive',
             updated_at = NOW()
         WHERE id = $1`,
        [existingByEmail.id, hash]
      );
    } else if (existingByEmail.role !== 'admin') {
      await pool.query(
        `UPDATE users
         SET role = 'admin',
             subscription_plan = 'none',
             subscription_status = 'inactive',
             updated_at = NOW()
         WHERE id = $1`,
        [existingByEmail.id]
      );
    }
    return;
  }

  const { rows } = await pool.query(`SELECT id, email FROM users WHERE role = 'admin' LIMIT 1`);
  if (rows[0]) {
    if (config.forceAdminSync) {
      await pool.query(
        `UPDATE users
         SET email = $2,
             password_hash = $3,
             subscription_plan = 'none',
             subscription_status = 'inactive',
             updated_at = NOW()
         WHERE id = $1`,
        [rows[0].id, normalizedEmail, hash]
      );
    }
    return;
  }

  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role, subscription_plan, subscription_status)
     VALUES ($1, $2, $3, 'admin', 'none', 'inactive')`,
    [id, normalizedEmail, hash]
  );
};

export const createUser = async (email: string, password: string) => {
  const hash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, password_hash)
     VALUES ($1, $2, $3)`,
    [id, email.toLowerCase(), hash]
  );
  return getUserById(id);
};

export const recordDeviceLogin = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::INT AS count FROM user_devices WHERE user_id = $1`,
    [userId]
  );
  const count = rows[0] ? Number(rows[0].count) : 0;
  if (count >= config.deviceLimit) {
    return { success: false };
  }
  await pool.query(
    `INSERT INTO user_devices (id, user_id, device_id)
     VALUES ($1, $2, $3)`,
    [randomUUID(), userId, `device_${randomUUID()}`]
  );
  return { success: true };
};

export const removeLatestDevice = async (userId: string) => {
  await pool.query(
    `DELETE FROM user_devices
     WHERE id IN (
        SELECT id FROM user_devices
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
     )`,
    [userId]
  );
};

export const requestSubscription = async (userId: string, plan: SubscriptionPlan, paymentScreenshot: string) => {
  await pool.query(
    `UPDATE users
     SET subscription_plan = $2,
         subscription_status = 'pending',
         subscription_start = NULL,
         subscription_expiry = NULL,
         payment_screenshot = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, plan, paymentScreenshot]
  );
  return getUserById(userId);
};

export const approveSubscription = async (userId: string) => {
  const existing = await getUserById(userId);
  if (!existing) {
    return null;
  }
  const now = new Date();
  const expiry = new Date(now);
  const plan = existing.subscription.plan === 'none' ? 'weekly' : existing.subscription.plan;
  if (plan === 'weekly') {
    expiry.setDate(expiry.getDate() + 7);
  } else if (plan === 'monthly') {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  await pool.query(
    `UPDATE users
     SET subscription_plan = $2,
         subscription_status = 'active',
         subscription_start = $3,
         subscription_expiry = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, plan, now.toISOString(), expiry.toISOString()]
  );
  await createNotification(userId, 'subscription_approved', 'Your subscription has been approved! You now have full access.');
  return getUserById(userId);
};

export const resetSubscription = async (userId: string) => {
  await pool.query(
    `UPDATE users
     SET subscription_plan = 'none',
         subscription_status = 'inactive',
         subscription_start = NULL,
         subscription_expiry = NULL,
         payment_screenshot = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
  return getUserById(userId);
};

interface UpdateUserPayload {
  subscription?: Partial<Subscription>;
  freeAccess?: {
    midWeekExpires?: string | null;
    weekendExpires?: string | null;
  };
}

export const updateUser = async (userId: string, payload: UpdateUserPayload) => {
  const sets: string[] = [];
  const values: any[] = [];

  if (payload.subscription) {
    const { plan, status, startDate, expiryDate, paymentScreenshot } = payload.subscription;
    if (plan !== undefined) {
      sets.push(`subscription_plan = $${values.length + 1}`);
      values.push(plan);
    }
    if (status !== undefined) {
      sets.push(`subscription_status = $${values.length + 1}`);
      values.push(status);
    }
    if (startDate !== undefined) {
      sets.push(`subscription_start = $${values.length + 1}`);
      values.push(startDate);
    }
    if (expiryDate !== undefined) {
      sets.push(`subscription_expiry = $${values.length + 1}`);
      values.push(expiryDate);
    }
    if (paymentScreenshot !== undefined) {
      sets.push(`payment_screenshot = $${values.length + 1}`);
      values.push(paymentScreenshot);
    }
  }

  if (payload.freeAccess) {
    if (payload.freeAccess.midWeekExpires !== undefined) {
      sets.push(`free_access_mid_week = $${values.length + 1}`);
      values.push(payload.freeAccess.midWeekExpires);
    }
    if (payload.freeAccess.weekendExpires !== undefined) {
      sets.push(`free_access_weekend = $${values.length + 1}`);
      values.push(payload.freeAccess.weekendExpires);
    }
  }

  if (!sets.length) {
    return getUserById(userId);
  }

  sets.push('updated_at = NOW()');

  await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length + 1}`,
    [...values, userId]
  );

  return getUserById(userId);
};

export const deleteUser = async (userId: string) => {
  const result = await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  const deletedCount = result.rowCount ?? 0;
  return deletedCount > 0;
};

export const changePassword = async (userId: string, newPassword: string, currentPassword?: string) => {
  const { rows } = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) {
    return { success: false, message: 'User not found.' };
  }
  if (currentPassword) {
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return { success: false, message: 'Current password is incorrect.' };
    }
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
    [userId, hash]
  );
  return { success: true, message: 'Password changed successfully.' };
};

export const changeEmail = async (userId: string, newEmail: string, currentPassword?: string) => {
  const normalizedEmail = newEmail.toLowerCase();
  const { rows } = await pool.query(`SELECT id, password_hash FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) {
    return { success: false, code: 'user_not_found' };
  }

  if (currentPassword) {
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return { success: false, code: 'invalid_password' };
    }
  }

  const emailOwner = await getUserRowByEmail(normalizedEmail);
  if (emailOwner && emailOwner.id !== userId) {
    return { success: false, code: 'email_in_use' };
  }

  await pool.query(
    `UPDATE users
     SET email = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [normalizedEmail, userId]
  );

  const updatedUser = await getUserById(userId);
  if (!updatedUser) {
    return { success: false, code: 'user_not_found' };
  }

  return { success: true, user: updatedUser };
};

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  approveSubscription,
  changeEmail,
  changePassword,
  createUser,
  deleteUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  getUserCredentialsByEmail,
  recordDeviceLogin,
  removeLatestDevice,
  requestSubscription,
  resetSubscription,
  updateUser,
} from './services/userService';
import {
  addPredictions,
  deletePrediction,
  fetchPredictions,
  fetchWeeklyStats,
  updatePredictionResult,
} from './services/predictionService';
import { getSettings, updateSettings } from './services/settingsService';
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './services/notificationService';

const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

const asyncHandler = (handler: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

router.post('/auth/register', asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  const { email, password } = schema.parse(req.body);
  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ code: 'email_in_use' });
  }
  const created = await createUser(email, password);
  return res.status(201).json({ user: created });
}));

router.post('/auth/login', asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  const { email, password } = schema.parse(req.body);
  const row = await getUserCredentialsByEmail(email);
  if (!row) {
    return res.status(401).json({ code: 'invalid_credentials' });
  }
  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    return res.status(401).json({ code: 'invalid_credentials' });
  }
  const recorded = await recordDeviceLogin(row.id);
  if (!recorded.success) {
    return res.status(403).json({ code: 'device_limit_reached' });
  }
  const user = await getUserById(row.id);
  return res.json({ user });
}));

router.post('/auth/logout', asyncHandler(async (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const { userId } = schema.parse(req.body);
  await removeLatestDevice(userId);
  res.status(204).send();
}));

router.get('/users', asyncHandler(async (_req, res) => {
  const users = await getAllUsers();
  res.json({ users });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const schema = z.object({ id: z.string().uuid() });
  const { id } = schema.parse(req.params);
  const user = await getUserById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user });
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const schema = z.object({
    id: z.string().uuid(),
  });
  const payloadSchema = z.object({
    subscription: z.object({
      plan: z.enum(['none', 'weekly', 'monthly']).optional(),
      status: z.enum(['inactive', 'pending', 'active', 'expired']).optional(),
      startDate: z.string().nullable().optional(),
      expiryDate: z.string().nullable().optional(),
      paymentScreenshot: z.string().nullable().optional(),
    }).optional(),
    freeAccess: z.object({
      midWeekExpires: z.string().nullable().optional(),
      weekendExpires: z.string().nullable().optional(),
    }).optional(),
  });
  const { id } = schema.parse(req.params);
  const payload = payloadSchema.parse(req.body);
  const user = await updateUser(id, payload);
  res.json({ user });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const schema = z.object({ id: z.string().uuid() });
  const { id } = schema.parse(req.params);
  const deleted = await deleteUser(id);
  if (!deleted) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(204).send();
}));

router.post('/users/:id/subscription/request', asyncHandler(async (req, res) => {
  const paramSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    plan: z.enum(['weekly', 'monthly']),
    paymentScreenshot: z.string(),
  });
  const { id } = paramSchema.parse(req.params);
  const { plan, paymentScreenshot } = bodySchema.parse(req.body);
  const user = await requestSubscription(id, plan, paymentScreenshot);
  res.json({ user });
}));

router.post('/users/:id/subscription/approve', asyncHandler(async (req, res) => {
  const schema = z.object({ id: z.string().uuid() });
  const { id } = schema.parse(req.params);
  const user = await approveSubscription(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user });
}));

router.post('/users/:id/subscription/reset', asyncHandler(async (req, res) => {
  const schema = z.object({ id: z.string().uuid() });
  const { id } = schema.parse(req.params);
  const user = await resetSubscription(id);
  res.json({ user });
}));

router.post('/users/:id/password', asyncHandler(async (req, res) => {
  const paramSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    newPassword: z.string().min(6),
    currentPassword: z.string().min(6).optional(),
  });
  const { id } = paramSchema.parse(req.params);
  const { newPassword, currentPassword } = bodySchema.parse(req.body);
  const result = await changePassword(id, newPassword, currentPassword);
  const status = result.success ? 200 : 400;
  res.status(status).json(result);
}));

router.post('/users/:id/email', asyncHandler(async (req, res) => {
  const paramSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    newEmail: z.string().email(),
    currentPassword: z.string().min(6).optional(),
  });
  const { id } = paramSchema.parse(req.params);
  const { newEmail, currentPassword } = bodySchema.parse(req.body);
  const result = await changeEmail(id, newEmail, currentPassword);
  if (!result.success) {
    const statusMap: Record<string, number> = {
      email_in_use: 409,
      invalid_password: 400,
      user_not_found: 404,
    };
    const status = statusMap[result.code ?? ''] ?? 400;
    return res.status(status).json({ code: result.code ?? 'email_change_failed' });
  }
  return res.json({ user: result.user });
}));

const predictionInputSchema = z.object({
  date: z.string(),
  league: z.string(),
  match: z.string(),
  tip: z.string(),
  odds: z.coerce.number().positive(),
  result: z.enum(['Pending', 'Won', 'Loss', 'Return']).optional(),
  type: z.enum(['big', 'small']),
  confidence: z.coerce.number().min(0).max(100).optional(),
  recommendedStake: z.coerce.number().min(1).optional(),
  probMax: z.coerce.number().min(0).optional(),
  finalScore: z.string().optional(),
});

router.post('/predictions', asyncHandler(async (req, res) => {
  const schema = z.object({ predictions: z.array(predictionInputSchema) });
  const { predictions } = schema.parse(req.body);
  await addPredictions(predictions.map((prediction) => ({
    ...prediction,
    result: prediction.result ?? 'Pending',
  })));
  res.status(201).json({ success: true });
}));

router.get('/predictions', asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(['pending', 'history']) });
  const { status } = schema.parse(req.query);
  const predictions = await fetchPredictions(status);
  res.json({ predictions });
}));

router.patch('/predictions/:id/result', asyncHandler(async (req, res) => {
  const paramSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    result: z.enum(['Pending', 'Won', 'Loss', 'Return']),
    finalScore: z.string().optional(),
  });
  const { id } = paramSchema.parse(req.params);
  const { result, finalScore } = bodySchema.parse(req.body);
  const prediction = await updatePredictionResult(id, result, finalScore);
  if (!prediction) {
    return res.status(404).json({ message: 'Prediction not found' });
  }
  res.json({ prediction });
}));

router.delete('/predictions/:id', asyncHandler(async (req, res) => {
  const schema = z.object({ id: z.string().uuid() });
  const { id } = schema.parse(req.params);
  const deleted = await deletePrediction(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Prediction not found' });
  }
  res.status(204).send();
}));

router.get('/stats/weekly', asyncHandler(async (_req, res) => {
  const stats = await fetchWeeklyStats();
  res.json({ stats });
}));

router.get('/settings', asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  res.json({ settings });
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const landingStatSchema = z.object({
    label: z.string(),
    value: z.string(),
    detail: z.string(),
  });

  const landingCredSchema = z.object({
    title: z.string(),
    description: z.string(),
  });

  const landingTestimonialSchema = z.object({
    quote: z.string(),
    author: z.string(),
    role: z.string(),
  });

  const landingSectionsSchema = z.object({
    heroTagline: z.string(),
    heroSubtitle: z.string(),
    primaryCta: z.string(),
    secondaryCta: z.string(),
    stats: z.array(landingStatSchema),
    credibility: z.array(landingCredSchema),
    testimonials: z.array(landingTestimonialSchema),
  });

  const schema = z.object({
    pageTitle: z.string().optional(),
    logoUrl: z.string().nullable().optional(),
    supportedLeagues: z.array(z.object({
      name: z.string(),
      logoUrl: z.string(),
    })).optional(),
    landingSections: landingSectionsSchema.optional(),
  });
  const payload = schema.parse(req.body);
  const settings = await updateSettings(payload);
  res.json({ settings });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const { userId } = schema.parse(req.query);
  const notifications = await listNotifications(userId);
  res.json({ notifications });
}));

router.post('/notifications/:id/read', asyncHandler(async (req, res) => {
  const schema = z.object({ id: z.string().uuid() });
  const { id } = schema.parse(req.params);
  const notification = await markNotificationAsRead(id);
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  res.json({ notification });
}));

router.post('/notifications/mark-all', asyncHandler(async (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const { userId } = schema.parse(req.body);
  const notifications = await markAllNotificationsAsRead(userId);
  res.json({ notifications });
}));

export default router;

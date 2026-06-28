import { Router } from 'express';
import { Queue } from 'bullmq';
import { supabase } from '../db/client.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

const redisConnection = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls:      process.env.REDIS_TLS === 'true' ? {} : undefined,
};

// Lazily create the queue only when an admin endpoint is actually called.
// This keeps the API server (posters, notifications, users, content-safety)
// from ever opening a Redis connection — so it never touches the Upstash
// quota just to serve a poster request.
let greetingQueue = null;
function getQueue() {
  if (!greetingQueue) {
    greetingQueue = new Queue('festival-greetings', { connection: redisConnection });
  }
  return greetingQueue;
}

// Admin authentication middleware — checks x-admin-key header
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_SECRET_KEY || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/admin/festival-blast
// Body: { festival_name, style_prompt, overlay_text }
router.post('/festival-blast', requireAdmin, async (req, res) => {
  const { festival_name, style_prompt, overlay_text } = req.body;

  if (!festival_name?.trim() || !overlay_text?.trim()) {
    return res.status(400).json({ error: 'festival_name and overlay_text are required.' });
  }

  // Fetch all active users from database
  const { data: users, error } = await supabase
    .from('app_users')
    .select('user_id, user_name, email')
    .eq('is_active', true);

  if (error)         return res.status(500).json({ error: 'Failed to fetch users from database.' });
  if (!users?.length) return res.status(404).json({ error: 'No active users found in database.' });

  // Add one job per user to the BullMQ queue
  const jobs = users.map((user) => ({
    name: 'send-greeting',
    data: {
      user,
      festival_name: festival_name.trim(),
      style_prompt:  (style_prompt || 'vibrant, cinematic lighting, digital art').trim(),
      overlay_text:  overlay_text.trim(),
    },
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 8000 },
      removeOnComplete: { count: 100 },
      removeOnFail:     { count: 50  },
    },
  }));

  await getQueue().addBulk(jobs);

  console.log(`📬 Festival blast queued: ${users.length} users | "${festival_name}"`);

  res.json({
    message:     `Festival blast queued for ${users.length} user${users.length !== 1 ? 's' : ''}.`,
    total_users: users.length,
    festival:    festival_name,
  });
});

// GET /api/admin/blast-status — live queue progress
router.get('/blast-status', requireAdmin, async (req, res) => {
  const q = getQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ]);
  res.json({ waiting, active, completed, failed });
});

export default router;

import { Router } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

// GET /api/notifications/:userId — fetch latest 20 greetings for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('festival_notifications')
    .select('id, festival_name, image_url, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: 'Failed to fetch notifications.' });
  res.json(data || []);
});

// PATCH /api/notifications/:notifId/read — mark a notification as read
router.patch('/:notifId/read', async (req, res) => {
  const { notifId } = req.params;
  const { error } = await supabase
    .from('festival_notifications')
    .update({ is_read: true })
    .eq('id', notifId);

  if (error) return res.status(500).json({ error: 'Failed to mark as read.' });
  res.json({ success: true });
});

export default router;

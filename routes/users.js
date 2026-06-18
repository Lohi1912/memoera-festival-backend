import { Router } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

// POST /api/users/register
// Called automatically after every sign-in / sign-up in the frontend.
// Upserts the user into app_users so festival blasts reach them.
router.post('/register', async (req, res) => {
  const { user_id, user_name, email } = req.body;

  if (!user_id || !email) {
    return res.status(400).json({ error: 'user_id and email are required.' });
  }

  const { error } = await supabase
    .from('app_users')
    .upsert(
      { user_id, user_name: user_name || email.split('@')[0], email, is_active: true },
      { onConflict: 'user_id' }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;

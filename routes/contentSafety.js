import { Router } from 'express';
import { supabase } from '../db/client.js';

const router = Router();

// POST /api/content-safety/check-duplicate
// Body: { imageHash, userId }
// Returns { duplicate: boolean } — true only if a DIFFERENT user already
// registered this exact image. First-ever upload of a hash registers it.
router.post('/check-duplicate', async (req, res) => {
  const { imageHash, userId } = req.body || {};
  if (!imageHash || !userId) {
    return res.status(400).json({ error: 'imageHash and userId are required' });
  }

  const { data: existing, error: selErr } = await supabase
    .from('target_image_hashes')
    .select('user_id')
    .eq('image_hash', imageHash)
    .maybeSingle();

  if (selErr) return res.status(500).json({ error: 'Lookup failed' });

  if (existing) {
    // Same user re-uploading their own photo — fine. Different user — blocked.
    return res.json({ duplicate: existing.user_id !== userId });
  }

  // First time this exact image has been seen — register it to this user.
  const { error: insErr } = await supabase
    .from('target_image_hashes')
    .insert({ image_hash: imageHash, user_id: userId });

  if (insErr) return res.status(500).json({ error: 'Registration failed' });
  res.json({ duplicate: false });
});

// POST /api/content-safety/check-moderation
// Body: { imageBase64 } (data URL, e.g. "data:image/jpeg;base64,...")
// Returns { flagged: boolean, categories: string[] }
router.post('/check-moderation', async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Moderation service not configured' });

  try {
    const aiRes = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: imageBase64 } }],
      }),
    });

    const data = await aiRes.json();
    if (!aiRes.ok) return res.status(502).json({ error: data.error?.message || 'Moderation request failed' });

    const result = data.results?.[0];
    if (!result) return res.json({ flagged: false, categories: [] });

    const flaggedCategories = Object.entries(result.categories || {})
      .filter(([, isFlagged]) => isFlagged)
      .map(([category]) => category);

    res.json({ flagged: !!result.flagged, categories: flaggedCategories });
  } catch (err) {
    res.status(502).json({ error: 'Moderation service unreachable' });
  }
});

export default router;

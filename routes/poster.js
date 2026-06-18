import { Router } from 'express';

const router = Router();

const DEFAULT_COLORS = { bg: '#0a1628', primary: '#00C9A7', secondary: '#C9A84C', text: '#ffffff' };

// POST /api/poster/generate — calls Claude to create poster content
router.post('/generate', async (req, res) => {
  const { occasion, name, details } = req.body || {};
  if (!occasion?.trim()) return res.status(400).json({ error: 'occasion is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

  const nameStr = name?.trim() || 'someone special';
  const extra = details?.trim() ? ` Extra details: ${details.trim()}.` : '';

  const prompt = `Create content for a beautiful ${occasion} celebration poster for ${nameStr}.${extra}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "title": "main greeting line (e.g. Happy Birthday!)",
  "name": "${nameStr}",
  "message": "warm heartfelt 2-sentence wish",
  "subtitle": "short inspiring tagline under 8 words",
  "emojis": "3-4 relevant celebration emojis",
  "colors": {
    "bg": "dark hex background matching occasion",
    "primary": "main accent hex color",
    "secondary": "secondary hex color",
    "text": "#ffffff"
  }
}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const ar = await aiRes.json();
    if (ar.error) return res.status(502).json({ error: ar.error.message });
    if (!ar.content?.length) return res.status(500).json({ error: 'empty AI response' });

    let text = ar.content[0].text.trim()
      .replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    let poster;
    try {
      poster = JSON.parse(text);
    } catch {
      poster = {
        title: 'Celebration!', name: nameStr, message: text,
        subtitle: 'With Love & Joy', emojis: '🎉✨🌟', colors: DEFAULT_COLORS,
      };
    }

    res.json(poster);
  } catch (err) {
    res.status(502).json({ error: 'AI service unreachable' });
  }
});

export default router;

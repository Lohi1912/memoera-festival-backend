import { Router } from 'express';
import sharp from 'sharp';

const router = Router();

const OCCASION_STYLES = {
  birthday:    'birthday party atmosphere, colorful balloons, confetti explosion, birthday cake with glowing candles, streamers, festive ribbons',
  anniversary: 'romantic anniversary setting, red roses, golden rings, soft candlelight, rose petals scattered, elegant romantic atmosphere',
  wedding:     'luxurious wedding setting, white flowers, golden ornaments, floral arch, dove motifs, pearl accents, bridal elegance',
  diwali:      'Diwali festival, glowing diyas oil lamps, rangoli patterns, fireworks in night sky, golden marigold flowers, traditional Indian motifs',
  christmas:   'Christmas celebration, decorated Christmas tree, glowing fairy lights, snowflakes, wrapped gifts, red and gold ornaments, winter wonderland',
  newyear:     'New Year celebration, fireworks bursting in night sky, champagne bubbles, clock striking midnight, golden confetti, sparkling cityscape',
  graduation:  'graduation ceremony, mortarboard cap and diploma, golden stars, laurel wreath, rays of achievement, academic excellence',
  eid:         'Eid Mubarak celebration, golden crescent moon and stars, mosque silhouette, lanterns, geometric Islamic patterns, festive lights',
  holi:        'Holi festival of colors, vibrant powder colors splashing, spring flowers, joyful celebration, traditional Indian patterns',
  default:     'festive celebration, ornamental decorative borders, bokeh light particles, golden accents, floral motifs',
};

const STYLE_VARIANTS = [
  'ultra-realistic digital art, vivid neon glow, futuristic holographic shimmer, deep rich shadows',
  'traditional Indian miniature painting style, intricate hand-painted gold leaf details, jewel tones',
  'luxury magazine editorial photography aesthetic, clean modern composition, professional studio lighting',
  'dreamy watercolor illustration, soft bleeding colors, delicate brush strokes, pastel bokeh background',
  'vintage retro art deco poster style, rich patina textures, ornate geometric borders, warm sepia-gold tones',
  'fantasy surreal art, magical glowing particles, ethereal mist, otherworldly beautiful atmosphere, vivid colors',
  'bold graphic design, vibrant flat colors with depth, strong contrasts, modern minimalist luxury aesthetic',
  'cinematic film poster style, dramatic god rays, deep shadows, ultra-detailed foreground, blurred depth background',
];

function getStyleHint(occasion) {
  const low = occasion.toLowerCase();
  for (const [key, style] of Object.entries(OCCASION_STYLES)) {
    if (low.includes(key)) return style;
  }
  return OCCASION_STYLES.default;
}

function pickVariant() {
  return STYLE_VARIANTS[Math.floor(Math.random() * STYLE_VARIANTS.length)];
}

function buildPrompt(occasion, nameStr, details) {
  const styleHint = getStyleHint(occasion);
  const variant   = pickVariant();
  const extra     = details?.trim() ? `Additional theme: ${details.trim()}. ` : '';
  return `Create a breathtaking ultra-premium digital greeting poster for ${occasion} for ${nameStr}. ${extra}Visual elements: ${styleHint}. Art style: ${variant}. Composition: portrait orientation, intricate ornamental gold-foil borders, depth-of-field bokeh background, glowing particle effects. Mood: warm joyful deeply celebratory and emotionally resonant. Technical: 8K resolution hyper-detailed vibrant HDR colors. Do NOT include any text letters words numbers or watermarks in the image.`;
}

router.post('/generate', async (req, res) => {
  const { occasion, name, details, logoBase64 } = req.body || {};
  if (!occasion?.trim()) return res.status(400).json({ error: 'occasion is required' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

  const nameStr = name?.trim() || 'someone special';
  const prompt  = buildPrompt(occasion, nameStr, details);

  try {
    const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:   'gpt-image-1',
        prompt,
        n:       1,
        size:    '1024x1536',
        quality: 'high',
      }),
    });

    const data = await aiRes.json();
    if (data.error) return res.status(502).json({ error: data.error.message });

    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    if (!b64 && !url) return res.status(500).json({ error: 'No image returned' });

    // If logo provided, composite it onto the poster
    if (logoBase64) {
      try {
        const posterBuf = b64
          ? Buffer.from(b64, 'base64')
          : Buffer.from(await fetch(url).then(r => r.arrayBuffer()));

        const rawLogo = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
        const logoBuf = Buffer.from(rawLogo, 'base64');

        // Resize logo to fit nicely in bottom-right corner (max 180px)
        const resizedLogo = await sharp(logoBuf)
          .resize(180, 180, { fit: 'inside' })
          .png()
          .toBuffer();

        const logoMeta = await sharp(resizedLogo).metadata();
        const posterMeta = await sharp(posterBuf).metadata();

        const padding = 32;
        const left = posterMeta.width  - logoMeta.width  - padding;
        const top  = posterMeta.height - logoMeta.height - padding;

        const composited = await sharp(posterBuf)
          .composite([{ input: resizedLogo, left, top, blend: 'over' }])
          .jpeg({ quality: 95 })
          .toBuffer();

        const finalB64 = composited.toString('base64');
        return res.json({
          imageBase64: `data:image/jpeg;base64,${finalB64}`,
          title: `Happy ${occasion}!`,
          name: nameStr,
        });
      } catch (logoErr) {
        console.error('Logo compositing failed:', logoErr.message);
        // Fall through and return image without logo
      }
    }

    const image = b64 ? `data:image/png;base64,${b64}` : url;
    res.json({ imageBase64: image, title: `Happy ${occasion}!`, name: nameStr });

  } catch (err) {
    console.error('Image generation error:', err.message);
    res.status(502).json({ error: 'Image generation failed' });
  }
});

export default router;
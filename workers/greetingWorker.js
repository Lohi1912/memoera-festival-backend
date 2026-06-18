import { Worker } from 'bullmq';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { overlayText } from '../utils/imageProcessor.js';
import { uploadGreetingImage } from '../utils/cloudStorage.js';
import { sendFestivalEmail } from '../utils/emailSender.js';
import { supabase } from '../db/client.js';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const redisConnection = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls:      process.env.REDIS_TLS === 'true' ? {} : undefined,
};

const worker = new Worker(
  'festival-greetings',
  async (job) => {
    const { user, festival_name, style_prompt, overlay_text } = job.data;
    job.log(`▶ Processing ${user.user_name} <${user.email}>`);

    // ── Phase 2: AI Image Generation ─────────────────────────────────────────
    const prompt =
      `A beautiful, high-quality holiday graphic for ${festival_name}, ` +
      `${style_prompt}, clean composition, abstract background, ` +
      `strictly no text, strictly no words, strictly no letters, ` +
      `digital art format, cinematic lighting, 4K quality.`;

    const aiResponse = await openai.images.generate({
      model:           'dall-e-3',
      prompt,
      n:               1,
      size:            '1024x1024',
      quality:         'standard',
      response_format: 'url',
    });

    const tempImageUrl = aiResponse.data[0].url;

    // Download image buffer from OpenAI's temporary URL
    const imgResponse = await fetch(tempImageUrl);
    if (!imgResponse.ok) throw new Error('Failed to download generated image from OpenAI');
    const rawBuffer = Buffer.from(await imgResponse.arrayBuffer());

    // ── Phase 2: Text Overlay ─────────────────────────────────────────────────
    const finalBuffer = await overlayText(rawBuffer, festival_name, user.user_name, overlay_text);

    // ── Phase 3: Upload to Supabase Storage ───────────────────────────────────
    const safeFestival = festival_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const fileName     = `${safeFestival}/${user.user_id}-${Date.now()}.jpg`;
    const publicUrl    = await uploadGreetingImage(finalBuffer, fileName);

    // ── Phase 3: Save notification to DB ─────────────────────────────────────
    const { error: dbError } = await supabase
      .from('festival_notifications')
      .insert({ user_id: user.user_id, festival_name, image_url: publicUrl, is_read: false });

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

    // ── Phase 4: Send email ───────────────────────────────────────────────────
    await sendFestivalEmail({
      toEmail:      user.email,
      userName:     user.user_name,
      festivalName: festival_name,
      imageUrl:     publicUrl,
      overlayText:  overlay_text,
    });

    job.log(`✅ Done for ${user.user_name} → ${publicUrl}`);
    return { userId: user.user_id, imageUrl: publicUrl };
  },
  {
    connection:  redisConnection,
    concurrency: 2,  // 2 parallel workers to respect DALL-E rate limits
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} — ${job.data.user.user_name}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
});

console.log('🔄 Festival Greeting Worker is running...');

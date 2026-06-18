import { supabase } from '../db/client.js';

const BUCKET = 'festival-greetings';

export async function uploadGreetingImage(imageBuffer, fileName) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

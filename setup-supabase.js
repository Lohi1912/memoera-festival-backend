import dotenv from 'dotenv';
dotenv.config();

const PROJECT_URL = 'https://heiceujtanuvfakmzqpa.supabase.co';
const PROJECT_REF = 'heiceujtanuvfakmzqpa';
const SECRET_KEY  = 'sb_secret_wvR2-gZZIYMfo0QUBX5jvQ_LFloLlwv';
const ANON_KEY    = 'sb_publishable_c8aDIAu9XiV3EOrBW24hxA_XJ6odTlj';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_users (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT    UNIQUE NOT NULL,
  user_name    TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS festival_notifications (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        TEXT    NOT NULL,
  festival_name  TEXT    NOT NULL,
  image_url      TEXT    NOT NULL,
  is_read        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_festival_notif_user
  ON festival_notifications(user_id, created_at DESC);
`;

async function runSQL(sql) {
  // Try Supabase Management API
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function createBucket() {
  const res = await fetch(`${PROJECT_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SECRET_KEY,
    },
    body: JSON.stringify({ id: 'festival-greetings', name: 'festival-greetings', public: true }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function verifyTables() {
  const res = await fetch(`${PROJECT_URL}/rest/v1/app_users?limit=1`, {
    headers: { 'Authorization': `Bearer ${SECRET_KEY}`, 'apikey': SECRET_KEY },
  });
  return res.status;
}

async function main() {
  console.log('🔧 Setting up Supabase for Memoera Festival Greetings...\n');

  // 1. Run schema SQL
  console.log('📋 Creating database tables...');
  const sqlResult = await runSQL(SCHEMA_SQL);
  if (sqlResult.status === 200 || sqlResult.status === 201) {
    console.log('✅ Tables created successfully');
  } else {
    console.log(`⚠️  SQL API returned ${sqlResult.status}:`, JSON.stringify(sqlResult.data));
    console.log('   → Will verify tables another way...');
  }

  // 2. Create storage bucket
  console.log('\n🪣 Creating festival-greetings storage bucket...');
  const bucketResult = await createBucket();
  if (bucketResult.status === 200 || bucketResult.status === 201) {
    console.log('✅ Storage bucket created successfully');
  } else if (bucketResult.data?.error === 'Duplicate' || bucketResult.status === 409) {
    console.log('✅ Storage bucket already exists');
  } else {
    console.log(`⚠️  Bucket creation returned ${bucketResult.status}:`, JSON.stringify(bucketResult.data));
  }

  // 3. Verify table access
  console.log('\n🔍 Verifying table access...');
  const verifyStatus = await verifyTables();
  if (verifyStatus === 200) {
    console.log('✅ app_users table is accessible');
  } else if (verifyStatus === 404) {
    console.log('❌ app_users table not found — SQL creation may have failed');
  } else {
    console.log(`ℹ️  Table check returned status ${verifyStatus}`);
  }

  // 4. Print env values
  console.log('\n📝 Use these values in your .env files:');
  console.log('─'.repeat(60));
  console.log(`SUPABASE_URL=${PROJECT_URL}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${SECRET_KEY}`);
  console.log(`SUPABASE_ANON_KEY=${ANON_KEY}`);
  console.log('─'.repeat(60));

  console.log('\n🎉 Setup complete!');
}

main().catch(console.error);

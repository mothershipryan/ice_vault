
const { createClient } = require('@supabase/supabase-js');

// Using the exact URL from the user's .env.local
const supabaseUrl = 'http://supabasekong-xwo48scwcs00owko44wwscwo.46.225.69.82.sslip.io/';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDY4NjcwMCwiZXhwIjo0OTI2MzYwMzAwLCJyb2xlIjoiYW5vbiJ9.kTof1tUJr_RS41rgbZcWBortzcdqfn7kc36nFKqt5tg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log(`Checking ${supabaseUrl}...`);

    // Try counting as a basic probe
    console.log("--- PROBING VIDEOS ---");
    const { count, error: vErr } = await supabase.from('videos').select('*', { count: 'exact', head: true });
    if (vErr) console.error("Videos Probe Error:", vErr);
    else console.log("Videos count:", count);

    console.log("\n--- LISTING RECORDS ---");
    const { data: videos } = await supabase.from('videos').select('id, user_id, s3_path').limit(2);
    console.log("Videos Sample:", JSON.stringify(videos, null, 2));

    console.log("\n--- BUCKETS ---");
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) console.error("Buckets Error:", bErr);
    else console.log("Buckets:", JSON.stringify(buckets.map(b => b.name), null, 2));
}

inspect();

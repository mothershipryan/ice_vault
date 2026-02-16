
const { createClient } = require('@supabase/supabase-js');

// Using the exact URL from the user's .env.local
const supabaseUrl = 'http://supabasekong-xwo48scwcs00owko44wwscwo.46.225.69.82.sslip.io/';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDY4NjcwMCwiZXhwIjo0OTI2MzYwMzAwLCJyb2xlIjoiYW5vbiJ9.kTof1tUJr_RS41rgbZcWBortzcdqfn7kc36nFKqt5tg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log(`Checking ${supabaseUrl}...`);

    // Try standard select as a basic probe
    console.log("--- PROBING VIDEOS ---");
    const { data: vData, error: vErr } = await supabase.from('videos').select('*').limit(1);
    if (vErr) console.error("Videos Probe Error:", JSON.stringify(vErr, null, 2));
    else console.log("Videos Probe Success (Table exists)");

    console.log("\n--- PROBING ACTIVITY_LOGS ---");
    const { data: aData, error: aErr } = await supabase.from('activity_logs').select('*').limit(1);
    if (aErr) console.error("Activity Logs Probe Error:", JSON.stringify(aErr, null, 2));
    else console.log("Activity Logs Probe Success (Table exists)");

    console.log("\n--- LISTING RECORDS ---");
    const { data: videos } = await supabase.from('videos').select('id, user_id, s3_path').limit(2);
    console.log("Videos Sample:", JSON.stringify(videos, null, 2));

    console.log("\n--- BUCKETS ---");
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) console.error("Buckets Error:", JSON.stringify(bErr, null, 2));
    else console.log("Buckets:", JSON.stringify(buckets.map(b => b.name), null, 2));
}

inspect();

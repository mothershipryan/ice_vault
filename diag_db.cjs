
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-xwo48scwcs00owko44wwscwo.46.225.69.82.sslip.io/';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDY4NjcwMCwiZXhwIjo0OTI2MzYwMzAwLCJyb2xlIjoiYW5vbiJ9.kTof1tUJr_RS41rgbZcWBortzcdqfn7kc36nFKqt5tg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("--- VIDEOS TABLE ---");
    const { data: videos, error: vErr } = await supabase.from('videos').select('*').limit(5);
    if (vErr) console.error("Videos Error:", vErr);
    else console.log(JSON.stringify(videos, null, 2));

    console.log("\n--- VIDEO_VAULT TABLE ---");
    const { data: vault, error: vaultErr } = await supabase.from('video_vault').select('*').limit(5);
    if (vaultErr) console.error("Vault Error:", vaultErr);
    else console.log(JSON.stringify(vault, null, 2));

    console.log("\n--- BUCKETS ---");
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) console.error("Buckets Error:", bErr);
    else console.log(JSON.stringify(buckets, null, 2));
}

inspect();

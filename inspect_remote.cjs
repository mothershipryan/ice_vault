
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://supabasekong-xwo48scwcs00owko44wwscwo.46.225.69.82.sslip.io/';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDY4NjcwMCwiZXhwIjo0OTI2MzYwMzAwLCJyb2xlIjoiYW5vbiJ9.kTof1tUJr_RS41rgbZcWBortzcdqfn7kc36nFKqt5tg';
const client = createClient(supabaseUrl, anonKey);

async function inspect() {
    console.log("--- PROBING CITIES (SELF-HOSTED) ---");
    const { data, error } = await client.from('cities').select('*').limit(5);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Sample Data:", JSON.stringify(data, null, 2));
    }

    const { count, error: countErr } = await client.from('cities').select('*', { count: 'exact', head: true });
    if (countErr) {
        console.error("Count Error:", countErr);
    } else {
        console.log("Total Count:", count);
    }
}

inspect();

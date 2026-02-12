import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-xwo48scwcs00owko44wwscwo.46.225.69.82.sslip.io/';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDY4NjcwMCwiZXhwIjo0OTI2MzYwMzAwLCJyb2xlIjoiYW5vbiJ9.kTof1tUJr_RS41rgbZcWBortzcdqfn7kc36nFKqt5tg';

const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'uploader@fuck-ice.com';
const password = 'PUBLIC_UPLOADER_PASSWORD_123!';

async function createGenericUser() {
    console.log(`Attempting to create user: ${email}`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
        if (error.message.includes('already registered')) {
            console.log('User already exists. Proceeding.');
        }
    } else {
        console.log('User created successfully:', data.user?.id);
    }
}

createGenericUser();

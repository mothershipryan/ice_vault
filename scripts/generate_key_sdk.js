import { FilenSDK } from '@filen/sdk';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\n🔐 Filen.io API Key Generator (using Official SDK)\n');

    try {
        const email = (await question('Enter your Filen Email: ')).trim();
        const password = (await question('Enter your Filen Password: ')).trim();
        const twoFactorCode = (await question('Enter 2FA Code (leave empty if none): ')).trim();

        console.log('\n⏳ Initializing SDK and Logging in...');

        const filen = new FilenSDK();

        const loginRes = await filen.login({
            email,
            password,
            twoFactorCode: twoFactorCode || undefined // SDK might prefer undefined to empty string
        });

        // The SDK stores the API key internally after login.
        // We can access it via filen.userInfo or similar internal state, 
        // but the SDK login response usually contains the key data directly.

        if (!loginRes || !loginRes.apiKey) {
            console.log('Login successful, but API Key format is different. Dumping response keys:');
            console.log(Object.keys(loginRes));
            // If the SDK abstracts the key away, we might need to inspect the internal state
            // However, typical usage returns the user object with apiKey.
        }

        if (loginRes.apiKey) {
            console.log('\n✅ SUCCESS! Here is your API Key:\n');
            console.log('\x1b[32m%s\x1b[0m', loginRes.apiKey);
            console.log('\n👉 Add this to your .env.local file as VITE_FILEN_API_KEY\n');
        } else {
            // Fallback: Check if it's in the internal state
            // filen.api.apiKey is often where it's stored
            if (filen.api && filen.api.apiKey) {
                console.log('\n✅ SUCCESS! Here is your API Key:\n');
                console.log('\x1b[32m%s\x1b[0m', filen.api.apiKey);
                console.log('\n👉 Add this to your .env.local file as VITE_FILEN_API_KEY\n');
            } else {
                throw new Error('Could not find API Key in SDK response. The SDK might mask it.');
            }
        }

    } catch (err) {
        console.error('\n❌ Error:', err.message || err);
        if (err.code === 'auth.tfa_required') {
            console.error('--> You need to provide the 2FA code.');
        }
    } finally {
        rl.close();
    }
}

main();

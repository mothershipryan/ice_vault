import readline from 'readline';
import crypto from 'crypto';
import https from 'https';

const API_URL = 'https://gateway.filen.io/v3';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Custom HTTPS Request function to replace global fetch
function httpsRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    return reject(new Error(`Request failed with status ${res.statusCode}: ${body}`));
                }
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function deriveKeys(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 200000, 64, 'sha512', (err, derivedKey) => {
            if (err) reject(err);

            const hex = derivedKey.toString('hex');
            const passwordKey = hex.substring(0, 64);
            const masterKey = hex.substring(64, 128);

            // Hash the password key again for login
            const hashedPassword = crypto.createHash('sha512').update(passwordKey).digest('hex');

            resolve({ hashedPassword, masterKey });
        });
    });
}

async function main() {
    console.log('\n🔐 Filen.io API Key Generator (Node Compatible)\n');

    try {
        const email = (await question('Enter your Filen Email: ')).trim();
        // Hide password input vaguely by clearing line (basic method)
        const password = (await question('Enter your Filen Password: ')).trim();
        const twoFactorCode = (await question('Enter 2FA Code (leave empty if none): ')).trim();

        console.log('\n⏳ Fetching salt...');

        // 1. Get Salt
        const infoData = await httpsRequest(`${API_URL}/auth/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ email }));

        if (!infoData.status || !infoData.data || !infoData.data.salt) {
            throw new Error(infoData.message || 'Failed to fetch salt');
        }

        console.log(`\nDEBUG: Salt found: ${infoData.data.salt.substring(0, 10)}...`);
        console.log('🔑 Deriving cryptographic keys (this takes a moment)...');
        const keys = await deriveKeys(password, infoData.data.salt);

        console.log('🚀 Logging in...');

        // 2. Login
        const loginData = await httpsRequest(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            email,
            password: keys.hashedPassword,
            authVersion: 2,
            twoFactorCode: twoFactorCode || "XXXXXX"
        }));

        if (!loginData.status) {
            if (loginData.code === 'auth.tfa_required') {
                throw new Error('2FA is required but was not provided or incorrect.');
            }
            throw new Error(loginData.message || 'Login failed');
        }

        console.log('\n✅ SUCCESS! Here is your API Key:\n');
        console.log('\x1b[32m%s\x1b[0m', loginData.data.apiKey);
        console.log('\n👉 Add this to your .env.local file as VITE_FILEN_API_KEY\n');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        rl.close();
    }
}

main();

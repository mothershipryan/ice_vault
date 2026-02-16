const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');

// Load env variables manually for CJS
const envPath = path.resolve(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const s3Client = new S3Client({
    region: env.VITE_S3_REGION || "nbg1",
    endpoint: env.VITE_S3_ENDPOINT || "https://nbg1.your-objectstorage.com",
    credentials: {
        accessKeyId: env.HETZNER_S3_ACCESS_KEY_ID,
        secretAccessKey: env.HETZNER_S3_SECRET_ACCESS_KEY,
    },
});

const corsConfig = {
    Bucket: "fuckicevault",
    CORSConfiguration: {
        CORSRules: [
            {
                AllowedOrigins: ["https://www.fuckice.site", "http://localhost:3000", "http://localhost:3001"],
                AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                AllowedHeaders: ["*"],
                ExposeHeaders: ["ETag"],
                MaxAgeSeconds: 3000,
            },
        ],
    },
};

async function run() {
    try {
        console.log("--- APPLYING CORS POLICY TO HETZNER S3 ---");
        console.log(`Target Bucket: ${corsConfig.Bucket}`);
        console.log(`Endpoint: ${env.VITE_S3_ENDPOINT}`);

        const data = await s3Client.send(new PutBucketCorsCommand(corsConfig));
        console.log("Success: CORS policy applied successfully.");
        console.log("You can now try the upload again on https://www.fuckice.site");
    } catch (err) {
        console.error("Error setting CORS:", err);
    }
}

run();

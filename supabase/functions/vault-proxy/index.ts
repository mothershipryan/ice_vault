import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();

        // 2. Secret validation (Must be set in Environment Variables)
        const accessKeyId = Deno.env.get('HETZNER_S3_ACCESS_KEY_ID');
        const secretAccessKey = Deno.env.get('HETZNER_S3_SECRET_ACCESS_KEY');

        if (!accessKeyId || !secretAccessKey) {
            throw new Error("SECURE_KEYS_MISSING: Ensure S3 keys are set in environment variables.");
        }

        // 3. Initialize Lightweight S3 Client
        const s3Client = new S3Client({
            endPoint: "nbg1.your-objectstorage.com",
            region: "nbg1",
            useSSL: true,
            accessKey: accessKeyId,
            secretKey: secretAccessKey,
        });

        const BUCKET_NAME = "fuckicevault";
        let result;

        switch (action) {
            case 'get_presigned_url':
                // Generate a PUT URL for uploading
                const url = await s3Client.getPresignedUrl("PUT", payload.key, {
                    bucketName: BUCKET_NAME,
                    expirySeconds: 3600
                });
                result = { url };
                break;

            case 'delete_object':
                // Perform S3 deletion
                await s3Client.deleteObject(payload.key, {
                    bucketName: BUCKET_NAME
                });
                result = { success: true };
                break;

            default:
                throw new Error(`Invalid action: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(`[Vault-Proxy] error: ${error.message}`);
        return new Response(JSON.stringify({
            error: error.message,
            version: "v4-lite",
            hint: "Check environment variables and bucket permissions."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

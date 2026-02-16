import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.370.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.370.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();
        console.log(`[Vault-Proxy] action: ${action}`);

        // 2. Initialize S3 Client from Secrets
        const s3Client = new S3Client({
            region: Deno.env.get('VITE_S3_REGION') || 'nbg1',
            endpoint: Deno.env.get('VITE_S3_ENDPOINT'),
            credentials: {
                accessKeyId: Deno.env.get('HETZNER_S3_ACCESS_KEY_ID')!,
                secretAccessKey: Deno.env.get('HETZNER_S3_SECRET_ACCESS_KEY')!,
            },
            forcePathStyle: true,
        });

        let result;

        switch (action) {
            case 'get_presigned_url':
                const command = new PutObjectCommand({
                    Bucket: 'fuckicevault',
                    Key: payload.key,
                    ContentType: payload.fileType || 'application/octet-stream',
                });
                const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                result = { url };
                break;

            case 'delete_object':
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: 'fuckicevault',
                    Key: payload.key,
                });
                await s3Client.send(deleteCommand);
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
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

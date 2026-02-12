import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge', // Use Edge Runtime for speed and lower latency
};

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // 1. Initialize Supabase Client with User's Token
        // We use the ANON key + User Token to respect RLS but mask the IP
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: authHeader,
                    },
                },
                auth: {
                    persistSession: false, // No session persistence needed for proxy
                }
            }
        );

        const body = await req.json();
        const { action, payload } = body;

        let result;

        // 2. Handle Actions
        switch (action) {
            case 'save_metadata':
                // Payload: { blind_index_state, encrypted_metadata, ... }
                const { data: insertData, error: insertError } = await supabase
                    .from('video_vault_v2') // Hardened Schema
                    .insert(payload)
                    .select()
                    .single();

                if (insertError) throw insertError;
                result = insertData;
                break;

            case 'search_vault':
                // Payload: { stateHash, cityHash, dateHash } (Optional)
                let query = supabase.from('video_vault_v2').select('*');

                // Apply Blind Index Filters if provided
                // Note: The SERVER (Vercel) applies the filters, Supabase just sees the query.
                if (payload?.stateHash) query = query.eq('blind_index_state', payload.stateHash);
                if (payload?.cityHash) query = query.eq('blind_index_city', payload.cityHash);
                if (payload?.dateHash) query = query.eq('blind_index_date', payload.dateHash);

                const { data: searchData, error: searchError } = await query;
                if (searchError) throw searchError;
                result = searchData;
                break;

            case 'get_legacy_records':
                const { data: legacyData, error: legacyError } = await supabase
                    .from('video_vault')
                    .select('*');
                if (legacyError) throw legacyError;
                result = legacyData;
                break;

            case 'get_presigned_url':
                // Payload: { filename, fileType }
                // @ts-ignore
                const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
                // @ts-ignore
                const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

                const s3Client = new S3Client({
                    region: process.env.VITE_S3_REGION,
                    endpoint: process.env.VITE_S3_ENDPOINT,
                    credentials: {
                        accessKeyId: process.env.HETZNER_S3_ACCESS_KEY_ID!,
                        secretAccessKey: process.env.HETZNER_S3_SECRET_ACCESS_KEY!,
                    },
                    forcePathStyle: true, // Required for some S3-compatible providers
                });

                const command = new PutObjectCommand({
                    Bucket: 'fuckicevault', // Bucket name
                    Key: payload.key,
                    ContentType: payload.fileType,
                });

                const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                result = { url };
                break;

            default:
                return new Response(JSON.stringify({ error: 'Invalid Action' }), { status: 400 });
        }

        return new Response(JSON.stringify({ data: result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Proxy Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

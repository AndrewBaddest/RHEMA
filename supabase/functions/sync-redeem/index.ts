import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }
    const accessToken = authHeader.split(' ')[1];

    // Verify the user (just to ensure the token is valid)
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { code } = await req.json();
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing code' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use the project client (bypass RLS – but disable RLS on sync_codes)
    const { data: syncRecord, error: fetchError } = await supabase
      .from('sync_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !syncRecord) {
      console.error('❌ Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired code' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Mark as used
    await supabase
      .from('sync_codes')
      .update({ used: true })
      .eq('code', code);

    console.log('✅ Redeemed sync code for user:', syncRecord.user_id);

    return new Response(
      JSON.stringify({
        refresh_token: syncRecord.encrypted_refresh_token,
        user_id: syncRecord.user_id,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
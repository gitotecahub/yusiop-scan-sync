import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const jwt = auth.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authedClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user }, error: uerr } = await authedClient.auth.getUser();
    if (uerr || !user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminData } = await admin.rpc('is_admin', { _user_id: user.id });
    if (!isAdminData) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const { claimId } = body ?? {};
    if (!claimId) return new Response(JSON.stringify({ error: 'claimId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: claim, error: cerr } = await admin
      .from('collaboration_claims_v2')
      .select('id, claimant_user_id, claimant_stage_name, song_title_snapshot, participation_type, status, admin_note, rejection_reason')
      .eq('id', claimId).maybeSingle();
    if (cerr || !claim) return new Response(JSON.stringify({ error: 'claim not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: userRes, error: getUserErr } = await admin.auth.admin.getUserById(claim.claimant_user_id);
    if (getUserErr || !userRes?.user?.email) {
      return new Response(JSON.stringify({ error: 'recipient email not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const templateName = claim.status === 'approved' ? 'claim-approved' : 'claim-status-update';
    const appUrl = Deno.env.get('APP_PUBLIC_URL') ?? 'https://yusiop.com';

    const invokeRes = await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail: userRes.user.email,
        idempotencyKey: `claim-${claim.status}-${claim.id}-${Date.now()}`,
        templateData: {
          artistName: claim.claimant_stage_name,
          songTitle: claim.song_title_snapshot ?? 'una canción',
          participationType: claim.participation_type,
          status: claim.status,
          reason: claim.rejection_reason ?? undefined,
          adminNote: claim.admin_note ?? undefined,
          appUrl,
        },
      },
    });
    if (invokeRes.error) {
      return new Response(JSON.stringify({ error: invokeRes.error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

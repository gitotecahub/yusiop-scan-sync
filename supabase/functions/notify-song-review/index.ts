// Edge function: notifica al artista por email tras aprobar/rechazar una canción.
// Resuelve el email del usuario vía auth.admin (service role) y llama a send-transactional-email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  submission_id: string;
  kind: "approved" | "rejected";
  reason?: string;
  app_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller is an admin (verify_jwt = true would be ideal; we double-check role)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const callerId = userData?.user?.id;
  if (!callerId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Check admin role
  const { data: isAdminData } = await admin.rpc("is_admin", { _user_id: callerId });
  if (!isAdminData) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.submission_id || !body.kind) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look up submission
  const { data: sub, error: subErr } = await admin
    .from("song_submissions")
    .select("user_id, title, artist_name")
    .eq("id", body.submission_id)
    .maybeSingle();
  if (subErr || !sub) {
    return new Response(JSON.stringify({ error: "Submission not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve email via auth admin
  const { data: authUser, error: aErr } = await admin.auth.admin.getUserById(sub.user_id);
  if (aErr || !authUser?.user?.email) {
    return new Response(JSON.stringify({ error: "Recipient email not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const recipient = authUser.user.email;

  const templateName = body.kind === "approved" ? "song-approved" : "song-rejected";
  const appUrl = body.app_url || "https://yusiop.com";

  const { error: invokeErr } = await admin.functions.invoke("send-transactional-email", {
    body: {
      templateName,
      recipientEmail: recipient,
      idempotencyKey: `${templateName}-${body.submission_id}`,
      templateData: {
        songTitle: sub.title,
        artistName: sub.artist_name,
        reason: body.reason ?? "",
        appUrl,
      },
    },
  });

  if (invokeErr) {
    console.error("send-transactional-email failed", invokeErr);
    return new Response(JSON.stringify({ error: "Email send failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

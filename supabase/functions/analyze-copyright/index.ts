// Edge function: analyze-copyright
// Analiza una submission para detectar posibles problemas de copyright.
// Estrategia (sin binarios externos, 100% gratuita):
//   1) Hash SHA-256 del audio  → detecta duplicados exactos en Yusiop o re-subidas
//   2) Búsqueda en MusicBrainz por título + artista (fuzzy) → detecta canciones registradas
//   3) Búsqueda en AcoustID por metadatos (lookup_meta) como capa extra
//
// Sistema de umbrales:
//   - score >= 90  → BLOQUEAR (mark_copyright_blocked, rechaza la submission)
//   - score 60-89  → REVIEW (admin debe decidir)
//   - score <  60  → CLEAN (pasa limpio)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchResult {
  source: "internal_duplicate" | "musicbrainz" | "acoustid";
  confidence: number; // 0..100
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  reason?: string;
}

// --------- helpers ---------

const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// Levenshtein distance for fuzzy similarity
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0).map((_, i) => i);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const similarity = (a: string, b: string): number => {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
};

// --------- MusicBrainz ---------

interface MBRecording {
  id: string;
  title: string;
  score?: number;
  "artist-credit"?: { name: string; artist?: { name: string } }[];
  releases?: { title: string }[];
}

const searchMusicBrainz = async (
  title: string,
  artist: string,
): Promise<MatchResult[]> => {
  try {
    // Query Lucene
    const q = `recording:"${title.replace(/"/g, "")}" AND artist:"${artist.replace(/"/g, "")}"`;
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(q)}&fmt=json&limit=5`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Yusiop-CopyrightCheck/1.0 ( contacto@yusiop.app )",
        Accept: "application/json",
      },
    });
    if (!r.ok) {
      console.warn("MusicBrainz HTTP", r.status);
      return [];
    }
    const j = (await r.json()) as { recordings?: MBRecording[] };
    const out: MatchResult[] = [];
    for (const rec of j.recordings ?? []) {
      const recArtist =
        rec["artist-credit"]?.map((c) => c.name).join(" ") ?? "";
      const titleSim = similarity(rec.title, title);
      const artistSim = similarity(recArtist, artist);
      // Combined confidence biased to title (60/40)
      const combined = Math.round(titleSim * 0.6 + artistSim * 0.4);
      // MusicBrainz also returns a score 0..100 indicating relevance
      const mbScore = typeof rec.score === "number" ? rec.score : 0;
      // Only consider strong matches
      if (combined < 70 && mbScore < 90) continue;
      out.push({
        source: "musicbrainz",
        confidence: Math.max(combined, mbScore),
        title: rec.title,
        artist: recArtist,
        album: rec.releases?.[0]?.title,
        url: `https://musicbrainz.org/recording/${rec.id}`,
        reason: `Coincidencia con grabación registrada en MusicBrainz (título ${titleSim}%, artista ${artistSim}%).`,
      });
    }
    return out;
  } catch (e) {
    console.error("MusicBrainz error:", e);
    return [];
  }
};

// --------- AcoustID lookup_meta ---------

const searchAcoustID = async (
  title: string,
  artist: string,
  apiKey: string,
): Promise<MatchResult[]> => {
  try {
    // AcoustID lookup with metadata (no fingerprint required for this endpoint)
    // Reference: https://acoustid.org/webservice
    const params = new URLSearchParams({
      client: apiKey,
      meta: "recordings+releases",
      // Lookup by free-text track + artist via the search endpoint
    });
    const url = `https://api.acoustid.org/v2/lookup?${params.toString()}&track=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      console.warn("AcoustID HTTP", r.status);
      return [];
    }
    const j = (await r.json()) as {
      status?: string;
      results?: {
        score?: number;
        recordings?: {
          title?: string;
          artists?: { name: string }[];
          releases?: { title?: string }[];
        }[];
      }[];
    };
    if (j.status !== "ok") return [];
    const out: MatchResult[] = [];
    for (const res of j.results ?? []) {
      for (const rec of res.recordings ?? []) {
        const recArtist = (rec.artists ?? []).map((a) => a.name).join(" ");
        const titleSim = similarity(rec.title ?? "", title);
        const artistSim = similarity(recArtist, artist);
        const combined = Math.round(titleSim * 0.6 + artistSim * 0.4);
        const acScore = Math.round((res.score ?? 0) * 100);
        if (combined < 70 && acScore < 80) continue;
        out.push({
          source: "acoustid",
          confidence: Math.max(combined, acScore),
          title: rec.title,
          artist: recArtist,
          album: rec.releases?.[0]?.title,
          reason: `Coincidencia en base de datos AcoustID (título ${titleSim}%, artista ${artistSim}%).`,
        });
      }
    }
    return out;
  } catch (e) {
    console.error("AcoustID error:", e);
    return [];
  }
};

// --------- main ---------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ACOUSTID_API_KEY = Deno.env.get("ACOUSTID_API_KEY") ?? "";

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const submissionId: string | undefined = body?.submission_id;
    if (!submissionId || typeof submissionId !== "string") {
      return new Response(
        JSON.stringify({ error: "submission_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use anon-key client to verify caller identity
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for storage + RPCs (bypasses RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch the submission
    const { data: sub, error: subErr } = await admin
      .from("song_submissions")
      .select(
        "id,user_id,title,artist_name,album_title,track_url,track_path,audio_hash,status",
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: only the owner OR an admin can run this
    const { data: isAdminRow } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const isOwner = sub.user_id === user.id;
    if (!isOwner && !isAdminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark analyzing
    await admin.rpc("update_copyright_analysis", {
      p_submission_id: submissionId,
      p_status: "analyzing",
      p_score: 0,
      p_matches: [],
      p_audio_hash: null,
    });

    // ---- 1) Audio hash (download up to ~10MB to keep it fast) ----
    let audioHash: string | null = sub.audio_hash ?? null;
    try {
      if (sub.track_path) {
        const { data: signed } = await admin.storage
          .from("artist-submissions")
          .createSignedUrl(sub.track_path, 60 * 5);
        if (signed?.signedUrl) {
          // Range request: first 10MB is more than enough for a stable hash
          const r = await fetch(signed.signedUrl, {
            headers: { Range: "bytes=0-10485759" },
          });
          if (r.ok || r.status === 206) {
            const ab = new Uint8Array(await r.arrayBuffer());
            audioHash = await sha256Hex(ab);
          }
        }
      }
    } catch (e) {
      console.error("Hash error:", e);
    }

    const matches: MatchResult[] = [];

    // ---- 2) Internal duplicate detection ----
    if (audioHash) {
      const { data: dupes } = await admin
        .from("song_submissions")
        .select("id,title,artist_name,user_id")
        .eq("audio_hash", audioHash)
        .neq("id", submissionId)
        .in("status", ["pending", "approved"])
        .limit(5);
      for (const d of dupes ?? []) {
        // If the duplicate belongs to a *different* user, very strong signal
        const sameUser = d.user_id === sub.user_id;
        matches.push({
          source: "internal_duplicate",
          confidence: sameUser ? 70 : 100,
          title: d.title,
          artist: d.artist_name,
          reason: sameUser
            ? "Has subido este mismo audio anteriormente."
            : "Audio idéntico ya subido por otro usuario en Yusiop.",
        });
      }
    }

    // ---- 3) MusicBrainz ----
    if (sub.title && sub.artist_name) {
      const mb = await searchMusicBrainz(sub.title, sub.artist_name);
      matches.push(...mb);
    }

    // ---- 4) AcoustID metadata lookup ----
    if (ACOUSTID_API_KEY && sub.title && sub.artist_name) {
      const ac = await searchAcoustID(sub.title, sub.artist_name, ACOUSTID_API_KEY);
      matches.push(...ac);
    }

    // ---- Score computation ----
    // Strongest match wins. Internal exact-duplicate by other user → 100.
    matches.sort((a, b) => b.confidence - a.confidence);
    const topScore = matches[0]?.confidence ?? 0;

    let status: "clean" | "review" | "blocked";
    let reason = "";
    if (topScore >= 90) {
      status = "blocked";
      reason =
        matches[0]?.reason ??
        "Coincidencia muy alta con material protegido por derechos de autor.";
    } else if (topScore >= 60) {
      status = "review";
      reason = "Posible coincidencia, requiere revisión manual.";
    } else {
      status = "clean";
      reason = "Sin coincidencias relevantes detectadas.";
    }

    // Persist
    if (status === "blocked") {
      await admin.rpc("mark_copyright_blocked", {
        p_submission_id: submissionId,
        p_reason: reason,
        p_score: topScore,
        p_matches: matches.slice(0, 10),
      });
      // Also update audio_hash separately (mark_copyright_blocked doesn't touch it)
      if (audioHash) {
        await admin
          .from("song_submissions")
          .update({ audio_hash: audioHash })
          .eq("id", submissionId);
      }
    } else {
      await admin.rpc("update_copyright_analysis", {
        p_submission_id: submissionId,
        p_status: status,
        p_score: topScore,
        p_matches: matches.slice(0, 10),
        p_audio_hash: audioHash,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        score: topScore,
        matches: matches.slice(0, 10),
        audio_hash: audioHash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-copyright error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    // Best-effort: mark error
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.submission_id) {
        await admin.rpc("update_copyright_analysis", {
          p_submission_id: body.submission_id,
          p_status: "error",
          p_score: 0,
          p_matches: [{ source: "internal_duplicate", confidence: 0, reason: msg }],
          p_audio_hash: null,
        });
      }
    } catch (_) {
      /* ignore */
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

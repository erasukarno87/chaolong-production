/**
 * admin-create-user — Edge Function
 * Membuat akun Supabase Auth baru. Hanya bisa dipanggil oleh super_admin.
 * Email langsung dikonfirmasi (email_confirm: true) — cocok untuk sistem internal.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── 1. Ambil JWT caller dari header ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verifikasi JWT caller
    const { data: { user: caller }, error: authErr } = await serviceClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !caller) return json({ error: "unauthorized" }, 401);

    // ── 2. Pastikan caller adalah super_admin ────────────────────────────────
    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "forbidden" }, 403);

    // ── 3. Baca payload ──────────────────────────────────────────────────────
    const { email, password, display_name, username } = await req.json() as {
      email: string;
      password: string;
      display_name?: string;
      username?: string;
    };

    if (!email || !password) return json({ error: "email and password required" }, 400);
    if (password.length < 6)  return json({ error: "password min 6 characters" }, 400);

    // ── 4. Buat user baru (email langsung dikonfirmasi) ──────────────────────
    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name || email },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // ── 5. Set username di profiles (trigger handle_new_user sudah insert row) ─
    if (username) {
      await serviceClient
        .from("profiles")
        .update({ username, display_name: display_name || null })
        .eq("user_id", created.user.id);
    } else if (display_name) {
      await serviceClient
        .from("profiles")
        .update({ display_name })
        .eq("user_id", created.user.id);
    }

    return json({ user_id: created.user.id, email: created.user.email });
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

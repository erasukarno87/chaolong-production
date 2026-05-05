// Verify an operator's PIN against the bcrypt hash stored in public.operators.
// Runs with the SERVICE ROLE so it can read pin_hash. Returns the operator
// (without pin_hash) on success, or 401 on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  operator_id: z.string().uuid(),
  pin: z.string().min(4).max(8).regex(/^\d+$/),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { operator_id, pin } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: op, error } = await supabase
      .from("operators")
      .select("id, full_name, employee_code, role, initials, avatar_color, active, assigned_line_ids, pin_hash")
      .eq("id", operator_id)
      .eq("active", true)
      .maybeSingle();

    if (error || !op) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ok = await compare(pin, op.pin_hash);
    if (!ok) {
      return new Response(JSON.stringify({ error: "invalid_pin" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safe = { ...op };
    delete safe.pin_hash;
    return new Response(JSON.stringify({ operator: safe }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

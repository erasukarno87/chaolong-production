// Generate 2FA setup with QR code and backup codes
// Called when user initiates 2FA setup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encodeBase32 } from "https://deno.land/x/base32@v0.2.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  user_id: z.string().uuid(),
});

// Generate random secret for TOTP
function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  const randomBuffer = new Uint8Array(20);
  crypto.getRandomValues(randomBuffer);
  for (let i = 0; i < randomBuffer.length; i++) {
    secret += chars[randomBuffer[i] % 32];
  }
  return secret;
}

// Generate 10 backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()
      .padEnd(8, "0");
    codes.push(code);
  }
  return codes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "invalid_input", details: parsed.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { user_id } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", user_id)
      .maybeSingle();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate secret and backup codes
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();

    // Generate TOTP URL for QR code
    const otpauth_url = `otpauth://totp/Chao%20Long%20Production:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Chao%20Long%20Production&algorithm=SHA1&digits=6&period=30`;

    return new Response(
      JSON.stringify({
        secret,
        qr_code_url: otpauth_url,
        backup_codes: backupCodes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

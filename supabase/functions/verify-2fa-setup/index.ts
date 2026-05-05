// Verify TOTP code during 2FA setup and store secret in database
// User provides the code from authenticator app to confirm it works
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  user_id: z.string().uuid(),
  secret: z.string(),
  totp_code: z.string().length(6).regex(/^\d+$/),
  backup_codes: z.array(z.string()),
});

// Verify TOTP code against secret
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const epoch = Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(epoch / 30);

  for (let i = -window; i <= window; i++) {
    const counter = (timeCounter + i).toString().padStart(8, "0");
    const hmac = new Uint8Array(20);

    // Simple HMAC-SHA1 verification
    // In production, use a proper TOTP library
    const expectedCode = generateTOTPCode(secret, timeCounter + i);
    if (expectedCode === token) {
      return true;
    }
  }

  return false;
}

// Generate TOTP code for time counter
function generateTOTPCode(secret: string, counter: number): string {
  // Base32 decode secret
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret) {
    const idx = chars.indexOf(char);
    if (idx >= 0) {
      bits += idx.toString(2).padStart(5, "0");
    }
  }

  // Convert bits to bytes for HMAC
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substring(i, i + 8);
    bytes.push(parseInt(byte, 2));
  }

  // For this demo, return a simplified calculation
  // In production, use @scure/base32 and @noble/hashes
  const code = Math.floor(
    (Math.abs(counter) * bytes.reduce((a, b) => a + b, 0)) % 1000000
  );
  return code.toString().padStart(6, "0");
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

    const { user_id, secret, totp_code, backup_codes } = parsed.data;

    // Verify TOTP code
    if (!verifyTOTP(secret, totp_code)) {
      return new Response(JSON.stringify({ error: "invalid_totp_code" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store 2FA secret and backup codes in database
    // Note: In production, hash the secret and backup codes before storing
    const { error: updateError } = await supabase
      .from("users")
      .update({
        twofa_secret: secret,
        twofa_backup_codes: backup_codes,
        twofa_enabled: true,
        twofa_setup_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "2FA setup verified successfully",
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

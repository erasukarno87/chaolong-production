// Verify TOTP code during login or for session re-authentication
// Validates the 6-digit code or backup code provided by user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  user_id: z.string().uuid(),
  code: z.string().min(6).max(8), // Either 6-digit TOTP or 8-digit backup code
});

// Generate TOTP code for time counter
function generateTOTPCode(secret: string, counter: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret) {
    const idx = chars.indexOf(char);
    if (idx >= 0) {
      bits += idx.toString(2).padStart(5, "0");
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substring(i, i + 8);
    bytes.push(parseInt(byte, 2));
  }

  const code = Math.floor(
    (Math.abs(counter) * bytes.reduce((a, b) => a + b, 0)) % 1000000
  );
  return code.toString().padStart(6, "0");
}

// Verify TOTP code against secret
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const epoch = Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(epoch / 30);

  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTPCode(secret, timeCounter + i);
    if (expectedCode === token) {
      return true;
    }
  }

  return false;
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

    const { user_id, code } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's 2FA secret and backup codes
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("twofa_secret, twofa_backup_codes, twofa_enabled")
      .eq("id", user_id)
      .maybeSingle();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.twofa_enabled) {
      return new Response(
        JSON.stringify({ error: "2fa_not_enabled" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let isValid = false;
    let usedBackupCode = false;

    // Check if code is 6-digit TOTP
    if (code.length === 6 && /^\d+$/.test(code)) {
      isValid = verifyTOTP(user.twofa_secret, code);
    }
    // Check if code is backup code
    else if (
      code.length === 8 &&
      user.twofa_backup_codes &&
      user.twofa_backup_codes.includes(code)
    ) {
      isValid = true;
      usedBackupCode = true;

      // Remove used backup code
      const remainingCodes = user.twofa_backup_codes.filter(
        (c: string) => c !== code
      );
      await supabase
        .from("users")
        .update({ twofa_backup_codes: remainingCodes })
        .eq("id", user_id);
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log 2FA verification for audit trail
    await supabase.from("user_logs").insert({
      user_id,
      action: usedBackupCode ? "2fa_backup_code_used" : "2fa_code_verified",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "2FA verification successful",
        used_backup_code: usedBackupCode,
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

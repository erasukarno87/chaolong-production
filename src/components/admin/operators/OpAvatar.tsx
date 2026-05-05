import { useState } from "react";
import type { Operator } from "./types";

interface OpAvatarProps {
  op: Pick<Operator, "photo_url" | "avatar_color" | "initials" | "full_name">;
  size?: "sm" | "lg";
}

/** Avatar that gracefully falls back to initials/color when photo fails to load */
export function OpAvatar({ op, size = "sm" }: OpAvatarProps) {
  const [err, setErr] = useState(false);
  const cls = size === "sm"
    ? "h-8 w-8 rounded-md text-xs"
    : "h-9 w-9 rounded-lg text-sm";

  if (op.photo_url && !err) {
    return (
      <img
        src={op.photo_url}
        alt=""
        onError={() => setErr(true)}
        className={`${cls} object-cover border shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${cls} grid place-items-center text-white font-bold shrink-0`}
      style={{ background: op.avatar_color ?? "hsl(var(--primary))" }}
    >
      {op.initials || op.full_name.slice(0, 2).toUpperCase()}
    </div>
  );
}

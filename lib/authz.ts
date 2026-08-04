import { runtimeEnv } from "@/lib/runtime";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowlist = (runtimeEnv().ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

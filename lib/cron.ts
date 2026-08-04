import { runtimeEnv } from "@/lib/runtime";

export function isAuthorizedCron(request: Request): boolean {
  const secret = runtimeEnv().CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

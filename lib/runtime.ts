type RuntimeEnv = {
  DB: D1Database;
  CRON_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAILS_ENABLED?: string;
  SITE_URL?: string;
  ADMIN_EMAILS?: string;
  VENMO_HANDLE?: string;
  PAYPAL_ACCOUNT?: string;
  ENTRY_FEE?: string;
};

declare global {
  // The Worker entry point installs the deployment bindings before handing a
  // request to Vinext. Bindings are stable for the Worker isolate.
  var __SEC_PICKEM_ENV__: RuntimeEnv | undefined;
}

export function runtimeEnv(): RuntimeEnv {
  const environment = globalThis.__SEC_PICKEM_ENV__;
  if (!environment) {
    throw new Error("The SEC Pick'em runtime environment is not available.");
  }
  return environment;
}

export function getD1(): D1Database {
  const database = runtimeEnv().DB;
  if (!database) {
    throw new Error("The SEC Pick'em database is not available.");
  }
  return database;
}

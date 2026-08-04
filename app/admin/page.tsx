import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SiteHeader } from "@/components/site-header";
import { isAdminEmail } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getChatGPTUser();
  const allowed = user ? isAdminEmail(user.email) : false;
  return (
    <main className="app-shell">
      <SiteHeader user={user} />
      <div className="page-width app-main">
        <div className="app-title-row"><div><p className="eyebrow">COMMISSIONER CONTROL</p><h1>Admin dashboard.</h1><p>Verify Venmo payments, monitor ballot completion, moderate messages, and export the contest.</p></div>{allowed ? <a className="button button-outline" href="/api/export">Export all picks CSV ↓</a> : null}</div>
        {allowed ? <AdminDashboard /> : <section className="app-panel access-card"><h2>Commissioner access only.</h2><p>Sign in using the commissioner email account.</p></section>}
      </div>
    </main>
  );
}

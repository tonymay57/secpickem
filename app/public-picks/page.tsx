import { getChatGPTUser } from "@/app/chatgpt-auth";
import { PublicBoard } from "@/components/public-board";
import { SiteHeader } from "@/components/site-header";
import { isAdminEmail } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function PublicPicksPage() {
  const user = await getChatGPTUser();
  const admin = user ? isAdminEmail(user.email) : false;
  return (
    <main className="app-shell">
      <SiteHeader user={user} />
      <div className="page-width app-main">
        <div className="app-title-row">
          <div>
            <p className="eyebrow">THE OPEN LEDGER</p>
            <h1>Contestant picks &amp; standings.</h1>
            <p>After kickoff, paid and submitted contestants can filter every verified ballot by week or SEC team.</p>
          </div>
          {admin ? <a className="button button-outline" href="/api/export">Download commissioner CSV ↓</a> : null}
        </div>
        <PublicBoard />
      </div>
    </main>
  );
}

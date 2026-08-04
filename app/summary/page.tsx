import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { SiteHeader } from "@/components/site-header";
import { SummaryClient } from "@/components/summary-client";
import { PICKS_LOCK_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const user = await getChatGPTUser();
  return (
    <main className="app-shell">
      <SiteHeader user={user} />
      <div className="page-width app-main">
        {!user ? (
          <section className="app-panel signin-card">
            <p className="eyebrow">YOUR SEASON CARD</p>
            <h1>Sign in to review your picks.</h1>
            <a className="button button-primary" href={chatGPTSignInPath("/summary")}>Sign in with ChatGPT →</a>
          </section>
        ) : (
          <>
            <div className="app-title-row">
              <div>
                <p className="eyebrow">PERSONAL PICK SUMMARY</p>
                <h1>Your season card.</h1>
                <p>Every SEC team, every opponent, and your predicted W–L–T record in one view.</p>
              </div>
              <div className="lock-badge">Picks lock {PICKS_LOCK_LABEL}</div>
            </div>
            <SummaryClient />
          </>
        )}
      </div>
    </main>
  );
}

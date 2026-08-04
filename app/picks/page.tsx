import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { PicksClient } from "@/components/picks-client";
import { SiteHeader } from "@/components/site-header";
import { PICKS_LOCK_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const user = await getChatGPTUser();

  return (
    <main className="app-shell">
      <SiteHeader user={user} />
      <div className="page-width app-main">
        {!user ? (
          <section className="app-panel signin-card">
            <p className="eyebrow">YOUR SEASON BALLOT</p>
            <h1>Sign in to make your picks.</h1>
            <p>
              Your selections are saved to your account and published on the
              transparent picks board after the deadline.
            </p>
            <a className="button button-primary" href={chatGPTSignInPath("/picks")}>
              Sign in with ChatGPT <span aria-hidden="true">→</span>
            </a>
            <p><Link className="text-link" href="/public-picks">View public picks instead</Link></p>
          </section>
        ) : (
          <>
            <div className="app-title-row">
              <div>
                <p className="eyebrow">WELCOME, {user.displayName}</p>
                <h1>Build your ballot.</h1>
                <p>Choose by week or follow one SEC team through its entire schedule.</p>
              </div>
              <div className="lock-badge">Picks lock {PICKS_LOCK_LABEL}</div>
            </div>
            <PicksClient />
            <div className="next-step-card">
              <div><strong>Finished picking?</strong><span>Review your team records, save the tiebreaker, and submit your ballot.</span></div>
              <Link className="button button-primary" href="/summary">Review &amp; submit →</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

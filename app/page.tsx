import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { PICKS_LOCK_LABEL } from "@/lib/constants";
import { SiteHeader } from "@/components/site-header";

const sampleGames = [
  { away: "East Carolina", home: "Alabama", pick: "Alabama", split: false },
  { away: "Tennessee", home: "Georgia", pick: "Split", split: true },
  { away: "Florida State", home: "Florida", pick: "Florida", split: false },
];

export default async function Home() {
  const user = await getChatGPTUser();
  const pickHref = user ? "/picks" : chatGPTSignInPath("/picks");

  return (
    <main>
      <section className="hero-shell">
        <div className="field-grid" aria-hidden="true" />
        <SiteHeader user={user} />

        <div className="hero-layout page-width">
          <div className="hero-copy">
            <p className="eyebrow">THE 2026 SEASON-LONG CHALLENGE</p>
            <h1>
              Call Every Game.
              <span>Own the Season.</span>
            </h1>
            <div className="gold-route" aria-hidden="true" />
            <p className="hero-lede">
              Pick every SEC regular-season game, split the conference matchups
              too close to call, and track the standings in full view.
            </p>
            <Link className="button button-primary hero-button" href={pickHref}>
              Start Your Picks <span aria-hidden="true">→</span>
            </Link>
            <p className="deadline">
              <span className="clock-mark" aria-hidden="true">◷</span>
              Picks lock {PICKS_LOCK_LABEL}
            </p>
          </div>

          <div className="clipboard-wrap" aria-label="Example Week 1 ballot">
            <div className="clip" aria-hidden="true"><span /></div>
            <article className="ticket-card">
              <div className="ticket-heading">
                <div>
                  <p>WEEK 1</p>
                  <h2>Your Picks</h2>
                </div>
                <span className="sketch-star" aria-hidden="true">☆</span>
              </div>

              <div className="sample-picks">
                {sampleGames.map((game, index) => (
                  <div className="sample-game" key={`${game.away}-${game.home}`}>
                    <span className="sample-time">SAT<br /><b>{index + 12}:00 CT</b></span>
                    <span className={game.pick === game.away ? "team-choice chosen" : "team-choice"}>
                      {game.away}
                    </span>
                    <span className={game.split ? "split-choice chosen-split" : "split-choice"}>
                      Split
                    </span>
                    <span className={game.pick === game.home ? "team-choice chosen" : "team-choice"}>
                      {game.home}{game.pick === game.home ? " ✓" : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="ticket-footer">
                <strong>3 of 3 selected</strong>
                <Link href={pickHref}>View all games <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          </div>
        </div>

        <div className="trust-rail page-width" aria-label="Pool features">
          <div><span className="trust-icon">◉</span><strong>Every regular-season game</strong></div>
          <div><span className="trust-icon">♟</span><strong>Paid-member picks ledger</strong></div>
          <div><span className="trust-icon">↗</span><strong>Weekly rankings</strong></div>
        </div>
      </section>

      <section className="rules-section" id="how-it-works">
        <div className="page-width">
          <p className="eyebrow">HOW THE RECORD WORKS</p>
          <div className="section-heading-row">
            <h2>Every SEC team result counts.</h2>
            <p>
              Your record is built one team at a time, so the scoring stays
              simple, consistent, and transparent.
            </p>
          </div>
          <div className="rule-grid">
            <article>
              <span className="rule-number">01</span>
              <h3>SEC vs. nonconference</h3>
              <p>Correctly call the SEC team&apos;s win or loss and earn one point.</p>
              <strong>1 team result • 1 point possible</strong>
            </article>
            <article>
              <span className="rule-number">02</span>
              <h3>Pick a conference winner</h3>
              <p>
                Call Alabama over Auburn correctly, for example, and you called
                both Alabama&apos;s win and Auburn&apos;s loss.
              </p>
              <strong>2 team results • 2 points possible</strong>
            </article>
            <article className="split-rule">
              <span className="rule-number">03</span>
              <h3>Split a conference game</h3>
              <p>
                Split is available only for SEC-vs-SEC games. It automatically
                records one correct result and one incorrect result.
              </p>
              <strong>Guaranteed 1–1 record</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="transparency-section" id="public-picks">
        <div className="page-width transparency-layout">
          <div>
            <p className="eyebrow">FULL TRANSPARENCY</p>
            <h2>Every ballot. Every week. Out in the open.</h2>
            <p>
              Once picks lock, submitted contestants whose payment is verified
              can compare selections and follow the standings. The commissioner
              can export the full contest as an Excel-ready file.
            </p>
          </div>
          <div className="transparency-actions">
            <Link className="button button-outline" href="/public-picks">
              Open the contestant picks ledger
            </Link>
          </div>
        </div>
      </section>

      <section className="entry-section">
        <div className="page-width entry-card">
          <div>
            <p className="eyebrow">$20 ENTRY • ALL SEASON</p>
            <h2>Pay with Venmo or PayPal.</h2>
            <p>
              Send the $20 entry fee using either payment service, include your
              sign-in email in the payment note, and mark it sent. The commissioner
              verifies every payment before opening paid-member features.
            </p>
          </div>
          <Link className="button button-primary" href={pickHref}>
            Create your ballot <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer>
        <div className="page-width footer-row">
          <strong>SEC PICK&apos;EM 2026</strong>
          <span>Independent fan pool • No school or conference affiliation</span>
        </div>
      </footer>
    </main>
  );
}

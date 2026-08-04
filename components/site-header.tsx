import Link from "next/link";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/authz";

export function SiteHeader({ user }: { user: ChatGPTUser | null }) {
  const admin = user ? isAdminEmail(user.email) : false;
  return (
    <header className="site-header">
      <div className="page-width header-inner">
        <Link className="wordmark" href="/" aria-label="SEC Pick'em 2026 home">
          <span className="wordmark-x" aria-hidden="true">×</span>
          SEC PICK&apos;EM 2026
          <span className="wordmark-rule" aria-hidden="true" />
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/#how-it-works">How It Works</Link>
          {user ? (
            <>
              <Link href="/picks">Picks</Link>
              <Link href="/summary">Summary</Link>
              <Link href="/board">Board</Link>
              <Link href="/public-picks">Ledger</Link>
              {admin ? <Link href="/admin">Admin</Link> : null}
              <a className="nav-button" href={chatGPTSignOutPath("/")}>Sign Out</a>
            </>
          ) : (
            <a className="nav-button" href={chatGPTSignInPath("/picks")}>Sign In</a>
          )}
        </nav>
      </div>
    </header>
  );
}

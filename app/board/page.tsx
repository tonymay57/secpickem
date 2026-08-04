import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { MessageBoard } from "@/components/message-board";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await getChatGPTUser();
  return (
    <main className="app-shell">
      <SiteHeader user={user} />
      <div className="page-width app-main">
        <div className="app-title-row"><div><p className="eyebrow">THE LOCKER ROOM</p><h1>Contestant message board.</h1><p>Open to participants whose ballot is submitted and payment is verified.</p></div></div>
        {user ? <MessageBoard /> : <section className="app-panel signin-card"><h1>Sign in to enter.</h1><a className="button button-primary" href={chatGPTSignInPath("/board")}>Sign in with ChatGPT →</a></section>}
      </div>
    </main>
  );
}

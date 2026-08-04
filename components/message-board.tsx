"use client";

import { FormEvent, useEffect, useState } from "react";

type Post = { id: number; body: string; createdAt: string; displayName: string };

export function MessageBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  async function load() {
    const response = await fetch("/api/board", { cache: "no-store" });
    const data = (await response.json()) as { posts?: Post[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load messages");
    setPosts(data.posts ?? []);
  }

  useEffect(() => {
    fetch("/api/board", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { posts?: Post[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load messages");
        setPosts(data.posts ?? []);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPosting(true);
    setError(null);
    try {
      const response = await fetch("/api/board", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not post message");
      setBody("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not post message");
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <section className="app-panel empty-state"><h2>Opening the locker room…</h2></section>;
  if (error && !posts.length) return <section className="app-panel access-card"><p className="eyebrow">ACCESS CHECK</p><h2>The board is not open for this account yet.</h2><p>{error}</p><a className="button button-outline" href="/summary">Check entry status</a></section>;

  return (
    <div className="board-layout">
      <form className="app-panel compose-card" onSubmit={submit}>
        <div className="panel-heading"><h2>Post a message</h2><span>{body.length} / 1200</span></div>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1200} rows={6} placeholder="Talk picks, games, and standings…" required />
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <button className="button button-primary" disabled={posting || body.trim().length < 2}>Post to the board</button>
      </form>
      <section className="message-feed" aria-label="Contestant messages">
        {posts.length ? posts.map((post) => (
          <article className="app-panel message-post" key={post.id}>
            <header><strong>{post.displayName}</strong><time>{new Date(post.createdAt).toLocaleString()}</time></header>
            <p>{post.body}</p>
          </article>
        )) : <section className="app-panel empty-state"><h2>Start the conversation.</h2><p>No messages have been posted yet.</p></section>}
      </section>
    </div>
  );
}

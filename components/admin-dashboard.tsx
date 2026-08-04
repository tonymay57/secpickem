"use client";

import { useEffect, useMemo, useState } from "react";

type Participant = {
  id: number;
  display_name: string;
  email: string;
  phone: string | null;
  tiebreaker: number | null;
  submitted_at: string | null;
  payment_claimed_at: string | null;
  paid: number;
  payment_verified_at: string | null;
  payment_note: string | null;
  pick_count: number;
};
type Post = { id: number; body: string; created_at: string; display_name: string };

export function AdminDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = (await response.json()) as { participants?: Participant[]; posts?: Post[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load commissioner records");
    setParticipants(data.participants ?? []);
    setPosts(data.posts ?? []);
    setNotes(Object.fromEntries((data.participants ?? []).map((participant) => [participant.id, participant.payment_note ?? ""])));
  }

  useEffect(() => {
    fetch("/api/admin", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { participants?: Participant[]; posts?: Post[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load commissioner records");
        setParticipants(data.participants ?? []);
        setPosts(data.posts ?? []);
        setNotes(Object.fromEntries((data.participants ?? []).map((participant) => [participant.id, participant.payment_note ?? ""])));
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    total: participants.length,
    submitted: participants.filter((participant) => participant.submitted_at).length,
    paid: participants.filter((participant) => Boolean(participant.paid)).length,
    claimed: participants.filter((participant) => participant.payment_claimed_at && !participant.paid).length,
  }), [participants]);

  async function update(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update record");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update record");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <section className="app-panel empty-state"><h2>Loading commissioner records…</h2></section>;

  return (
    <>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <div className="admin-stats">
        <article><strong>{counts.total}</strong><span>Contestants</span></article>
        <article><strong>{counts.submitted}</strong><span>Submitted</span></article>
        <article><strong>{counts.claimed}</strong><span>Awaiting verification</span></article>
        <article><strong>{counts.paid}</strong><span>Paid &amp; verified</span></article>
      </div>
      <section className="app-panel admin-section">
        <div className="panel-heading"><h2>Contestants &amp; payments</h2><span>Venmo verification is manual</span></div>
        <div className="table-scroll">
          <table className="admin-table">
            <thead><tr><th>Contestant</th><th>Ballot</th><th>Tiebreaker</th><th>Payment</th><th>Commissioner note</th><th>Action</th></tr></thead>
            <tbody>{participants.length ? participants.map((participant) => (
              <tr key={participant.id}>
                <td><strong>{participant.display_name}</strong><span>{participant.email}</span><small>{participant.phone || "No phone"}</small></td>
                <td><strong>{participant.pick_count} picks</strong><span>{participant.submitted_at ? "Submitted" : "Not submitted"}</span></td>
                <td>{participant.tiebreaker ?? "—"}</td>
                <td><span className={`payment-pill ${participant.paid ? "verified" : participant.payment_claimed_at ? "claimed" : ""}`}>{participant.paid ? "Verified" : participant.payment_claimed_at ? "Claims paid" : "Not marked"}</span></td>
                <td><input value={notes[participant.id] ?? ""} onChange={(event) => setNotes({ ...notes, [participant.id]: event.target.value })} placeholder="Venmo name or note" /></td>
                <td><button className="mini-button" disabled={busy === `payment-${participant.id}`} onClick={() => update({ action: "payment", participantId: participant.id, paid: !participant.paid, note: notes[participant.id] }, `payment-${participant.id}`)}>{participant.paid ? "Unverify" : "Verify paid"}</button></td>
              </tr>
            )) : <tr><td colSpan={6}>No contestants have signed in yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>
      <section className="app-panel admin-section">
        <div className="panel-heading"><h2>Message-board moderation</h2><span>{posts.length} active posts</span></div>
        <div className="moderation-list">
          {posts.length ? posts.map((post) => (
            <article key={post.id}><div><strong>{post.display_name}</strong><time>{new Date(post.created_at).toLocaleString()}</time><p>{post.body}</p></div><button className="mini-button danger" disabled={busy === `post-${post.id}`} onClick={() => update({ action: "delete-post", postId: post.id }, `post-${post.id}`)}>Remove</button></article>
          )) : <p>No messages to moderate.</p>}
        </div>
      </section>
    </>
  );
}

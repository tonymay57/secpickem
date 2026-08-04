"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SEC_TEAMS } from "@/lib/constants";
import { predictedRecord, predictedResult } from "@/lib/records";
import type { Game, PickSelection } from "@/lib/types";

type SummaryPayload = {
  games: Game[];
  picks: Record<string, PickSelection>;
  participant: {
    displayName: string;
    email: string;
    phone: string;
    tiebreaker: number | null;
    submittedAt: string | null;
    paymentClaimedAt: string | null;
    paid: boolean;
    lastPickUpdatedAt: string | null;
  };
  payment: {
    entryFee: number;
    venmoHandle: string;
    paypalAccount: string;
  };
  locked: boolean;
};

export function SummaryClient() {
  const [payload, setPayload] = useState<SummaryPayload | null>(null);
  const [form, setForm] = useState({ displayName: "", phone: "", tiebreaker: "" });
  const [status, setStatus] = useState("Loading your season card…");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/ballot", { cache: "no-store" });
    const data = (await response.json()) as SummaryPayload & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load your summary");
    setPayload(data);
    setForm({
      displayName: data.participant.displayName,
      phone: data.participant.phone,
      tiebreaker: data.participant.tiebreaker === null ? "" : String(data.participant.tiebreaker),
    });
    setStatus("");
  }

  useEffect(() => {
    fetch("/api/ballot", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as SummaryPayload & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load your summary");
        setPayload(data);
        setForm({
          displayName: data.participant.displayName,
          phone: data.participant.phone,
          tiebreaker: data.participant.tiebreaker === null ? "" : String(data.participant.tiebreaker),
        });
        setStatus("");
      })
      .catch((reason: Error) => { setError(reason.message); setStatus(""); });
  }, []);

  const weeks = useMemo(
    () => [...new Set(payload?.games.map((game) => game.week) ?? [])].sort((a, b) => a - b),
    [payload],
  );

  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ballot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update your ballot");
      await load();
      setStatus(success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your ballot");
    } finally {
      setBusy(false);
    }
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    return action({ action: "profile", ...form }, "Contestant information saved.");
  }

  if (!payload) return <section className="app-panel empty-state"><h2>{error ? "We hit a snag." : "Opening your season card…"}</h2><p>{error ?? status}</p></section>;

  const selectedCount = Object.keys(payload.picks).length;
  const complete = selectedCount === payload.games.length;
  const lastChanged = payload.participant.lastPickUpdatedAt
    ? new Date(`${payload.participant.lastPickUpdatedAt.replace(" ", "T")}Z`).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {status ? <div className="success-banner" role="status">{status}</div> : null}

      <div className="summary-top-grid">
        <form className="app-panel profile-card" onSubmit={saveProfile}>
          <div className="panel-heading"><h2>Contestant information</h2><span>Email is your login</span></div>
          <label>Display name<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required /></label>
          <label>Email<input value={payload.participant.email} readOnly aria-readonly="true" /></label>
          <label>Phone <small>(optional)</small><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>SEC Championship total-points tiebreaker<input type="number" min="0" max="200" value={form.tiebreaker} onChange={(event) => setForm({ ...form, tiebreaker: event.target.value })} required /></label>
          <button className="mini-button" disabled={busy}>Save information</button>
        </form>

        <section className="app-panel submission-card">
          <div className="panel-heading"><h2>Entry status</h2><span>{selectedCount} / {payload.games.length} picks</span></div>
          <div className="status-checks">
            <p className={complete ? "done" : ""}><b>1</b><span>Complete every game pick</span><strong>{complete ? "Done" : "In progress"}</strong></p>
            <p className={payload.participant.submittedAt ? "done" : ""}><b>2</b><span>Submit your ballot</span><strong>{payload.participant.submittedAt ? "Submitted" : "Waiting"}</strong></p>
            <p className={payload.participant.paymentClaimedAt ? "done" : ""}><b>3</b><span>Send the ${payload.payment.entryFee} entry fee</span><strong>{payload.participant.paymentClaimedAt ? "Marked sent" : "Waiting"}</strong></p>
            <p className={payload.participant.paid ? "done" : ""}><b>4</b><span>Commissioner verifies payment</span><strong>{payload.participant.paid ? "Verified" : "Pending"}</strong></p>
          </div>
          <div className="payment-options" aria-label="Payment options">
            <div>
              <span>Venmo</span>
              <strong>{payload.payment.venmoHandle || "See commissioner"}</strong>
            </div>
            <div>
              <span>PayPal</span>
              <strong>{payload.payment.paypalAccount || "See commissioner"}</strong>
            </div>
          </div>
          <p className="payment-note">Include the email you use to sign in within your payment note so the commissioner can match your entry.</p>
          <div className="submission-actions">
            <button className="button button-primary" disabled={busy || !complete || Boolean(payload.participant.submittedAt) || payload.locked} onClick={() => action({ action: "submit" }, "Your ballot is submitted.")}>Submit ballot</button>
            <button className="button button-outline" disabled={busy || Boolean(payload.participant.paymentClaimedAt)} onClick={() => action({ action: "claim-payment" }, "Payment marked as sent. The commissioner will verify it.")}>I sent my ${payload.payment.entryFee} payment</button>
          </div>
          {payload.participant.submittedAt ? (
            <p className="submission-edit-note"><strong>No resubmission needed.</strong> Changes to your picks save automatically until the deadline{lastChanged ? ` · Last pick change ${lastChanged}` : ""}.</p>
          ) : null}
          <a className="text-link" href="/api/export/me">Download my picks CSV ↓</a>
        </section>
      </div>

      <section className="app-panel season-card">
        <div className="panel-heading"><div><p className="eyebrow">SPREADSHEET-STYLE VIEW</p><h2>SEC team-by-team summary</h2></div><span>W–L–T reflects your selections</span></div>
        <div className="season-table-wrap">
          <table className="season-table">
            <thead><tr><th>Team / Record</th>{weeks.map((week) => <th key={week}><abbr title={`Week ${week}`}>W{week}</abbr></th>)}</tr></thead>
            <tbody>
              {SEC_TEAMS.map((team) => {
                const record = predictedRecord(payload.games, payload.picks, team.id);
                return (
                  <tr key={team.id}>
                    <th><strong>{team.name}</strong><span>{record.wins}–{record.losses}–{record.ties}</span></th>
                    {weeks.map((week) => {
                      const game = payload.games.find((item) => item.week === week && (item.homeTeamId === team.id || item.awayTeamId === team.id));
                      if (!game) return <td className="bye-cell" key={week}>Bye</td>;
                      const home = game.homeTeamId === team.id;
                      const opponent = home ? game.awayTeam : game.homeTeam;
                      const result = predictedResult(game, payload.picks[game.id], team.id);
                      return (
                        <td key={week}>
                          <strong className={`result-mark result-${result.toLowerCase()}`}>{result}</strong>
                          <span title={opponent}>{compactTeamName(opponent)}</span>
                          <small>{home ? "H" : "A"}</small>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function compactTeamName(name: string) {
  if (name.length <= 9) return name;
  const words = name.replace(/[^A-Za-z0-9& -]/g, "").split(/[\s-]+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0]).join("").slice(0, 5).toUpperCase();
  return name.slice(0, 6);
}

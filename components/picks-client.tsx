"use client";

import { useEffect, useMemo, useState } from "react";
import { SEC_TEAMS } from "@/lib/constants";
import { gameDate } from "@/lib/format";
import { predictedRecord } from "@/lib/records";
import type { Game, PickSelection } from "@/lib/types";

type PicksPayload = {
  games: Game[];
  picks: Record<string, PickSelection>;
  locked: boolean;
  participant: {
    submittedAt: string | null;
    lastPickUpdatedAt: string | null;
  };
};

export function PicksClient() {
  const [payload, setPayload] = useState<PicksPayload | null>(null);
  const [view, setView] = useState<"week" | "team">("week");
  const [week, setWeek] = useState(1);
  const [teamId, setTeamId] = useState<string>(SEC_TEAMS[0].id);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading the 2026 schedule…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/picks", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as PicksPayload & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load picks");
        setPayload(data);
        const firstWeek = data.games[0]?.week;
        if (firstWeek) setWeek(firstWeek);
        setMessage("");
      })
      .catch((reason: Error) => {
        setError(reason.message);
        setMessage("");
      });
  }, []);

  const weeks = useMemo(
    () => [...new Set(payload?.games.map((game) => game.week) ?? [])].sort((a, b) => a - b),
    [payload],
  );

  const visibleGames = useMemo(() => {
    if (!payload) return [];
    if (view === "week") return payload.games.filter((game) => game.week === week);
    return payload.games.filter(
      (game) => game.homeTeamId === teamId || game.awayTeamId === teamId,
    );
  }, [payload, teamId, view, week]);

  const selectedCount = Object.keys(payload?.picks ?? {}).length;
  const totalCount = payload?.games.length ?? 0;
  const progress = totalCount ? (selectedCount / totalCount) * 100 : 0;
  const teamRecord = useMemo(
    () => predictedRecord(payload?.games ?? [], payload?.picks ?? {}, teamId),
    [payload, teamId],
  );

  async function choose(game: Game, selection: PickSelection) {
    if (!payload || payload.locked || saving) return;
    const previous = payload.picks[game.id];
    setPayload({ ...payload, picks: { ...payload.picks, [game.id]: selection } });
    setSaving(game.id);
    setMessage("Saving…");
    setError(null);
    try {
      const response = await fetch("/api/picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: game.id, selection }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save that pick");
      setMessage("All changes saved");
    } catch (reason) {
      const restored = { ...payload.picks };
      if (previous) restored[game.id] = previous;
      else delete restored[game.id];
      setPayload({ ...payload, picks: restored });
      setError(reason instanceof Error ? reason.message : "Could not save that pick");
      setMessage("");
    } finally {
      setSaving(null);
    }
  }

  if (message && !payload) {
    return <section className="app-panel empty-state"><h2>Loading the playbook…</h2><p>{message}</p></section>;
  }

  if (error && !payload) {
    return <section className="app-panel empty-state"><h2>We hit a snag.</h2><p>{error}</p></section>;
  }

  if (!payload?.games.length) {
    return <section className="app-panel empty-state"><h2>The schedule is syncing.</h2><p>Refresh in a moment to begin your ballot.</p></section>;
  }

  return (
    <section className="app-panel">
      <div className="view-toolbar">
        <div className="segmented" aria-label="Choose how games are organized">
          <button className={view === "week" ? "active" : ""} onClick={() => setView("week")} aria-pressed={view === "week"}>By Week</button>
          <button className={view === "team" ? "active" : ""} onClick={() => setView("team")} aria-pressed={view === "team"}>By Team</button>
        </div>
        {view === "week" ? (
          <select className="filter-select" value={week} onChange={(event) => setWeek(Number(event.target.value))} aria-label="Select week">
            {weeks.map((item) => <option key={item} value={item}>Week {item}</option>)}
          </select>
        ) : (
          <div className="team-filter-wrap">
            <select className="filter-select" value={teamId} onChange={(event) => setTeamId(event.target.value)} aria-label="Select SEC team">
              {SEC_TEAMS.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
            <strong className="predicted-record" aria-label="Predicted record">
              {teamRecord.wins}–{teamRecord.losses}–{teamRecord.ties}
              <small>Predicted W–L–T</small>
            </strong>
          </div>
        )}
        <div className="progress-block">
          <div className="progress-label"><span>Ballot progress</span><span>{selectedCount} / {totalCount}</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <div className="save-note" aria-live="polite">
        {payload.locked ? "This ballot is locked." : message}
      </div>
      <p className="autosave-explainer">
        Every selection saves immediately. {payload.participant.submittedAt
          ? "Your ballot stays submitted when you make a change—no resubmission is needed before the deadline."
          : "After you submit, any change made before the deadline will also save without another submission."}
      </p>
      <div className="games-list">
        <div className="game-column-head" aria-hidden="true">
          <span>Game</span><span>Away</span><span>Split</span><span>Home</span><span>Value</span>
        </div>
        {visibleGames.map((game, index) => {
          const selected = payload.picks[game.id];
          const showWeek = view === "team" || index === 0;
          const canSplit = game.homeSec && game.awaySec;
          return (
            <div key={game.id}>
              {showWeek ? <div className="week-divider">Week {game.week}</div> : null}
              <article className="game-row">
                <div className="game-meta">{gameDate(game.startTime)}<br />{game.status}</div>
                <button className={`pick-option ${selected === "away" ? "selected" : ""}`} onClick={() => choose(game, "away")} disabled={payload.locked || saving === game.id} aria-pressed={selected === "away"}>
                  {game.awayTeam}{game.awaySec ? " • SEC" : ""}
                </button>
                <button className={`pick-option split ${selected === "split" ? "selected" : ""}`} onClick={() => choose(game, "split")} disabled={!canSplit || payload.locked || saving === game.id} aria-pressed={selected === "split"} title={canSplit ? "Record this SEC matchup as 1–1" : "Split is only available for SEC-vs-SEC games"}>
                  {canSplit ? "Split" : "No split"}
                </button>
                <button className={`pick-option ${selected === "home" ? "selected" : ""}`} onClick={() => choose(game, "home")} disabled={payload.locked || saving === game.id} aria-pressed={selected === "home"}>
                  {game.homeTeam}{game.homeSec ? " • SEC" : ""}
                </button>
                <div className="game-score">
                  {game.completed ? `${game.awayScore}–${game.homeScore}` : canSplit ? "2 pts" : "1 pt"}
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}

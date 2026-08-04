"use client";

import { useEffect, useMemo, useState } from "react";
import { SEC_TEAMS } from "@/lib/constants";
import { pickLabel } from "@/lib/format";
import type { Game, PickSelection, Standing } from "@/lib/types";

type PublicParticipant = {
  id: number;
  displayName: string;
  picks: Record<string, PickSelection>;
};

type PublicPayload = {
  games: Game[];
  participants: PublicParticipant[];
  standings: Standing[];
  favoriteIds: number[];
  pickTotals: Record<string, {
    away: { wins: number; losses: number };
    home: { wins: number; losses: number };
  }>;
};

export function PublicBoard() {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"week" | "team">("week");
  const [week, setWeek] = useState(1);
  const [teamId, setTeamId] = useState<string>(SEC_TEAMS[0].id);
  const [standingScope, setStandingScope] = useState<"all" | "favorites">("all");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public-picks", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as PublicPayload & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load public picks");
        setPayload(data);
        setFavoriteIds(data.favoriteIds);
        if (data.games[0]?.week) setWeek(data.games[0].week);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const weeks = useMemo(
    () => [...new Set(payload?.games.map((game) => game.week) ?? [])].sort((a, b) => a - b),
    [payload],
  );
  const visibleGames = useMemo(() => {
    if (!payload) return [];
    return view === "week"
      ? payload.games.filter((game) => game.week === week)
      : payload.games.filter(
          (game) => game.homeTeamId === teamId || game.awayTeamId === teamId,
        );
  }, [payload, teamId, view, week]);
  const visibleStandings = useMemo(() => {
    if (!payload) return [];
    const rows = standingScope === "favorites"
      ? payload.standings.filter((standing) => favoriteIds.includes(standing.id))
      : payload.standings;
    let priorScore: number | null = null;
    let rank = 0;
    return rows.map((standing, index) => {
      if (priorScore !== standing.correct) rank = index + 1;
      priorScore = standing.correct;
      return { ...standing, rank };
    });
  }, [favoriteIds, payload, standingScope]);

  async function toggleFavorite(participantId: number) {
    const wasFavorite = favoriteIds.includes(participantId);
    setFavoriteError(null);
    setFavoriteIds((current) => wasFavorite
      ? current.filter((id) => id !== participantId)
      : [...current, participantId]);
    try {
      const response = await fetch("/api/public-picks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ favoriteParticipantId: participantId, favorite: !wasFavorite }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update favorites");
    } catch (reason) {
      setFavoriteIds((current) => wasFavorite
        ? [...new Set([...current, participantId])]
        : current.filter((id) => id !== participantId));
      setFavoriteError(reason instanceof Error ? reason.message : "Could not update favorites");
    }
  }

  if (error) return <section className="app-panel access-card"><p className="eyebrow">LEDGER ACCESS</p><h2>The picks ledger is not open for this account yet.</h2><p>{error}</p><a className="button button-outline" href="/summary">Check entry status</a></section>;
  if (!payload) return <section className="app-panel empty-state"><h2>Opening the ledger…</h2><p>Loading picks and standings.</p></section>;

  return (
    <>
      <div className="board-summary" id="standings">
        <section className="app-panel standings-card">
          <div className="panel-heading leaderboard-heading">
            <div><h2>{standingScope === "all" ? "Overall standings" : "Favorite standings"}</h2><span>{visibleStandings.length} players</span></div>
            <div className="segmented compact-segmented" aria-label="Leaderboard group">
              <button className={standingScope === "all" ? "active" : ""} onClick={() => setStandingScope("all")}>All</button>
              <button className={standingScope === "favorites" ? "active" : ""} onClick={() => setStandingScope("favorites")}>Favorites</button>
            </div>
          </div>
          {favoriteError ? <p className="inline-error" role="alert">{favoriteError}</p> : null}
          {visibleStandings.length ? visibleStandings.map((standing) => (
            <div className="standing-row" key={standing.id}>
              <span className="rank-mark">{standing.rank}</span>
              <span>{standing.displayName}</span>
              <span className="record">{standing.correct}–{standing.wrong}</span>
            </div>
          )) : <p>{standingScope === "favorites" ? "Star contestants in the picks ledger to build your favorites leaderboard." : "No participant records yet."}</p>}
        </section>

        <section className="app-panel board-card">
          <div className="panel-heading">
            <div><p className="eyebrow">SCORING KEY</p><h2>Team-result scoring</h2></div>
          </div>
          <div className="rule-grid public-rule-grid">
            <article><h3>1 point</h3><p>Correct SEC result in a nonconference game.</p></article>
            <article><h3>2 points</h3><p>Correct winner in an SEC-vs-SEC game.</p></article>
            <article><h3>Split = 1–1</h3><p>Available only when both teams are in the SEC.</p></article>
          </div>
        </section>
      </div>

      <section className="app-panel board-card">
        <div className="view-toolbar">
          <div className="segmented">
            <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>By Week</button>
            <button className={view === "team" ? "active" : ""} onClick={() => setView("team")}>By Team</button>
          </div>
          {view === "week" ? (
            <select className="filter-select" value={week} onChange={(event) => setWeek(Number(event.target.value))}>
              {weeks.map((value) => <option key={value} value={value}>Week {value}</option>)}
            </select>
          ) : (
            <select className="filter-select" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              {SEC_TEAMS.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          )}
        </div>
        <p className="aggregate-note"><strong>How the field picked:</strong> The W–L total beneath each team reflects every verified ballot. A Split adds one win and one loss to both SEC teams.</p>
        <div className="table-scroll">
          <table className="picks-table">
            <thead>
              <tr>
                <th>Participant</th>
                {visibleGames.map((game) => {
                  const totals = payload.pickTotals[game.id];
                  return (
                    <th key={game.id}>
                      <span className="matchup-week">Week {game.week}</span>
                      <span className="matchup-total-row"><b>{game.awayTeam}</b><em>{totals?.away.wins ?? 0}–{totals?.away.losses ?? 0}</em></span>
                      <span className="matchup-at">at</span>
                      <span className="matchup-total-row"><b>{game.homeTeam}</b><em>{totals?.home.wins ?? 0}–{totals?.home.losses ?? 0}</em></span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {payload.participants.length ? payload.participants.map((participant) => (
                <tr key={participant.id}>
                  <td>
                    <button
                      className={`favorite-button ${favoriteIds.includes(participant.id) ? "selected" : ""}`}
                      onClick={() => toggleFavorite(participant.id)}
                      aria-pressed={favoriteIds.includes(participant.id)}
                      aria-label={`${favoriteIds.includes(participant.id) ? "Remove" : "Add"} ${participant.displayName} ${favoriteIds.includes(participant.id) ? "from" : "to"} favorites`}
                      title="Add to favorites leaderboard"
                    >★</button>
                    {participant.displayName}
                  </td>
                  {visibleGames.map((game) => {
                    const selection = participant.picks[game.id];
                    return <td className={selection === "split" ? "split-cell" : ""} key={game.id}>{pickLabel(game, selection)}</td>;
                  })}
                </tr>
              )) : (
                <tr><td colSpan={visibleGames.length + 1}>No ballots have been submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

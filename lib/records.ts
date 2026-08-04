import type { Game, PickSelection, PredictedRecord } from "@/lib/types";

export function predictedRecord(
  games: Game[],
  picks: Record<string, PickSelection>,
  teamId: string,
): PredictedRecord {
  return games.reduce<PredictedRecord>(
    (record, game) => {
      const selection = picks[game.id];
      const isHome = game.homeTeamId === teamId;
      const isAway = game.awayTeamId === teamId;
      if (!selection || (!isHome && !isAway)) return record;

      if (selection === "split") {
        record.ties += 1;
      } else if ((isHome && selection === "home") || (isAway && selection === "away")) {
        record.wins += 1;
      } else {
        record.losses += 1;
      }
      return record;
    },
    { wins: 0, losses: 0, ties: 0 },
  );
}

export function predictedResult(
  game: Game,
  selection: PickSelection | undefined,
  teamId: string,
) {
  if (!selection) return "—";
  if (selection === "split") return "T";
  const won =
    (game.homeTeamId === teamId && selection === "home") ||
    (game.awayTeamId === teamId && selection === "away");
  return won ? "W" : "L";
}

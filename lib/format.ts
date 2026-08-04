import type { Game, PickSelection } from "@/lib/types";

export function pickLabel(game: Game, selection?: PickSelection | null) {
  if (selection === "home") return game.homeTeam;
  if (selection === "away") return game.awayTeam;
  if (selection === "split") return "Split (1–1)";
  return "—";
}

export function gameDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

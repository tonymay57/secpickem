export const SEASON = 2026;
// Arkansas–Pine Bluff at Missouri kicks off the SEC season at 7:00 PM Central.
export const PICKS_LOCK_AT = "2026-09-04T00:00:00.000Z";
export const PICKS_LOCK_LABEL = "September 3, 2026 • 7:00 PM Central";

export const SEC_TEAMS = [
  { id: "333", name: "Alabama" },
  { id: "8", name: "Arkansas" },
  { id: "2", name: "Auburn" },
  { id: "57", name: "Florida" },
  { id: "61", name: "Georgia" },
  { id: "96", name: "Kentucky" },
  { id: "99", name: "LSU" },
  { id: "344", name: "Mississippi State" },
  { id: "142", name: "Missouri" },
  { id: "201", name: "Oklahoma" },
  { id: "145", name: "Ole Miss" },
  { id: "2579", name: "South Carolina" },
  { id: "2633", name: "Tennessee" },
  { id: "251", name: "Texas" },
  { id: "245", name: "Texas A&M" },
  { id: "238", name: "Vanderbilt" },
] as const;

export const SEC_TEAM_IDS = new Set<string>(SEC_TEAMS.map((team) => team.id));

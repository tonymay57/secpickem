import { isAuthorizedCron } from "@/lib/cron";
import { syncSecGames } from "@/lib/espn";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await syncSecGames());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Schedule sync failed" },
      { status: 500 },
    );
  }
}

export const POST = GET;

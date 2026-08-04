export async function POST() {
  return Response.json(
    {
      error:
        "Online checkout is scaffolded but not active. Connect the selected payment provider and entry fee first.",
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

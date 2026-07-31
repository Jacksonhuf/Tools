/** Minimal Vercel handler to verify /api routing before loading the full BFF bundle. */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/api/v1/ping") {
    return Response.json({
      ok: true,
      service: "mx-pricing-bff",
      vercel: process.env.VERCEL === "1",
    });
  }

  const { default: bffHandler } = await import("./bff-handler.mjs");
  return bffHandler(req);
}

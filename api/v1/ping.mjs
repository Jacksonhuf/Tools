export default function handler() {
  return Response.json({
    ok: true,
    service: "mx-pricing-bff",
    vercel: process.env.VERCEL === "1",
  });
}

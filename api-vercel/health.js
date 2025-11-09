// ✅ Simple health check for Vercel deployment
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || "local",
    service: "Enzy Delivery Carrier Service (Vercel)",
    version: "1.0.0",
  });
}

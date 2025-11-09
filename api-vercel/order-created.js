import crypto from "crypto";
import { syncOrderToStopSuite } from "../../lib/stopsuite-sync.js";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

/**
 * Shopify → StopSuite webhook (Vercel)
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    console.log("📥 Shopify webhook received (Vercel)");

    const body = req.body;
    if (!body || !body.id) {
      console.warn("⚠️ Missing or invalid order payload");
      return res.status(400).send("Missing order data");
    }

    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    if (hmacHeader && SHOPIFY_WEBHOOK_SECRET) {
      const generatedHash = crypto
        .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
        .update(JSON.stringify(body), "utf8")
        .digest("base64");

      if (generatedHash !== hmacHeader) {
        console.warn("⚠️ HMAC mismatch (ignored for now)");
      } else {
        console.log("✅ HMAC verified successfully");
      }
    }

    console.log(`⏳ Syncing order ${body.id} → StopSuite`);
    await syncOrderToStopSuite(body);
    console.log(`✅ StopSuite sync complete for order ${body.id}`);

    return res.status(200).send("✅ Webhook processed successfully");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
}

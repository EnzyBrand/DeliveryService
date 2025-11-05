import crypto from "crypto";
import { syncOrderToStopSuite } from "../../lib/stopsuite-sync.js";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

/**
 * Shopify → StopSuite webhook (Vercel Serverless Function)
 * Handles new orders and syncs them to StopSuite (customer, location, shop order, route)
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    console.log("📥 Shopify webhook received");
    console.log("📦 Headers:", req.headers);

    // ✅ Verify Shopify HMAC
    const generatedHash = crypto
      .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHash !== hmacHeader) {
      console.warn("⚠️ Webhook signature mismatch – rejecting request.");
      return res.status(401).send("Unauthorized");
    }

    const order = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log(`🧾 Received new order ${order.name} (${order.id})`);

    await syncOrderToStopSuite(order);

    return res.status(200).send("✅ Webhook received successfully");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
}

import crypto from "crypto";
import { syncOrderToStopSuite } from "../../lib/stopsuite-sync.js";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();

// ⚠️ IMPORTANT: Disable Vercel's automatic body parsing
// We need the raw body string to verify Shopify's HMAC signature
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Get raw body as string from Vercel request
 */
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      resolve(data);
    });
    req.on("error", reject);
  });
}

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

    // Get the raw body string for HMAC validation
    const rawBody = await getRawBody(req);

    console.log("📥 Shopify webhook received");
    console.log("📦 Headers:", req.headers);

    // ✅ Verify Shopify HMAC using the raw body
    const generatedHash = crypto
      .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
      .update(rawBody, "utf8")
      .digest("base64");

    if (generatedHash !== hmacHeader) {
      console.warn("⚠️ Webhook signature mismatch – rejecting request.");
      console.warn(`Expected: ${generatedHash}`);
      console.warn(`Received: ${hmacHeader}`);
      return res.status(401).send("Unauthorized");
    }

    // Parse the body after successful validation
    const order = JSON.parse(rawBody);
    console.log(`🧾 Received new order ${order.name} (${order.id})`);

    console.log(`⏳ Starting StopSuite sync for order ${order.id}...`);
    await syncOrderToStopSuite(order);
    console.log(`✅ StopSuite sync completed for order ${order.id}`);

    return res.status(200).send("✅ Webhook received successfully");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
}

import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL?.trim();
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();

/**
 * StopSuite → Shopify webhook (Vercel)
 * Marks Shopify order fulfilled when delivery is complete.
 */
export default async function handler(req, res) {
  // ✅ Allow CORS (for safe testing)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1️⃣ Extract headers
    const hmacHeader = req.headers["x-signature"];
    const timestamp = req.headers["x-timestamp"];
    const nonce = req.headers["x-nonce"];
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // 2️⃣ Verify StopSuite HMAC signature
    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(`POST|/api/webhooks/stopsuite-complete/|${timestamp}|${nonce}|${body}`)
      .digest("hex");

    if (expected !== hmacHeader) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      console.warn("⚙️ Expected:", expected);
      console.warn("⚙️ Received:", hmacHeader);
      return res.status(401).send("Unauthorized");
    }

    // 3️⃣ Parse webhook body
    const webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 StopSuite webhook received:", webhookData);

    // 4️⃣ Process only stop.completed events
    const stop = webhookData?.stop || webhookData;
    if (stop?.status === "complete" && stop?.external_reference) {
      const shopifyOrderId = stop.external_reference.replace("shopify_", "");

      // Build fulfillment URL (uses /admin/api/2025-04)
      const fulfillmentUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillments.json`;

      // Create fulfillment payload
      const payload = {
        fulfillment: {
          location_id: Number(process.env.SHOPIFY_LOCATION_ID),
          notify_customer: true,
        },
      };

      console.log("🚀 Posting fulfillment to:", fulfillmentUrl);
      console.log("🧾 Payload:", JSON.stringify(payload, null, 2));
      console.log("🔐 Token prefix:", SHOPIFY_ADMIN_TOKEN?.slice(0, 8));

      // 5️⃣ Send fulfillment request to Shopify
      const response = await fetch(fulfillmentUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log("✅ Shopify fulfillment response status:", response.status);
      console.log("🧾 Raw Shopify response:", text);
    } else {
      console.log("ℹ️ Ignored webhook (not stop.completed or missing external_reference)");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).send("Error");
  }
}

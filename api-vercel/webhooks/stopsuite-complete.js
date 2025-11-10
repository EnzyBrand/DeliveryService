import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL?.trim();
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();

/**
 * StopSuite → Shopify webhook (Vercel)
 * Handles `stop.completed` events, verifies HMAC, and fulfills the Shopify order.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1️⃣ Extract headers
    const hmacHeader = req.headers["x-signature"];
    const timestamp = req.headers["x-timestamp"];
    const nonce = req.headers["x-nonce"];

    // 2️⃣ Preserve raw body string (important for HMAC verification)
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // 3️⃣ Build the signed message exactly as StopSuite signs it
    const message = `POST|/api/webhooks/stopsuite-complete/|${timestamp}|${nonce}|${body}`;

    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(message)
      .digest("hex");

    if (expected !== hmacHeader) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      console.warn("Expected:", expected);
      console.warn("Received:", hmacHeader);
      return res.status(401).send("Unauthorized");
    }

    // 4️⃣ Parse safely
    let webhookData;
    try {
      webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (e) {
      console.error("❌ Failed to parse webhook JSON:", e);
      return res.status(400).send("Invalid JSON body");
    }

    console.log("📦 StopSuite webhook received:", webhookData);

    // 5️⃣ Handle only `stop.completed` events
    if (webhookData.event === "stop.completed" && webhookData.stop) {
      const stop = webhookData.stop;
      const stopId = stop.id;
      const orderId = stop.order; // numeric ID from StopSuite
      console.log(`✅ Stop completed: stop.id=${stopId}, order=${orderId}`);

      // 6️⃣ (Optional) map StopSuite order → Shopify order
      // For production, this would come from your own stored mapping
      const shopifyOrderId = `test-${orderId}`;

      // 7️⃣ Create fulfillment in Shopify
      const url = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillments.json`;
      const payload = {
        fulfillment: {
          location_id: Number(process.env.SHOPIFY_LOCATION_ID),
          notify_customer: true,
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // 8️⃣ Handle Shopify response safely
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.warn("⚠️ Shopify returned non-JSON response");
        data = {};
      }

      console.log("✅ Shopify order fulfillment response:", data);
    } else {
      console.log("ℹ️ Ignored event type:", webhookData.event);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).send("Error");
  }
}

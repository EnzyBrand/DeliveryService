import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL?.trim();
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();

/**
 * StopSuite → Shopify webhook (Vercel)
 * Marks Shopify order fulfilled when driver marks delivery complete.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const hmacHeader = req.headers["x-signature"];
    const timestamp = req.headers["x-timestamp"];
    const nonce = req.headers["x-nonce"];
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(`POST|/api/webhooks/stopsuite-complete/|${timestamp}|${nonce}|${body}`)
      .digest("hex");

    if (expected !== hmacHeader) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      return res.status(401).send("Unauthorized");
    }

    const webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 StopSuite webhook received:", webhookData);

    if (webhookData?.status === "complete" && webhookData?.external_reference) {
      const shopifyOrderId = webhookData.external_reference.replace("shopify_", "");

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

      const data = await response.json();
      console.log("✅ Shopify order fulfilled:", data);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).send("Error");
  }
}

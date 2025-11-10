import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL?.trim(); // e.g. https://yourstore.myshopify.com/admin/api/2025-04
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();

/**
 * StopSuite → Shopify Webhook
 * Fulfills a Shopify order when StopSuite marks a stop as completed.
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
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // 2️⃣ Verify StopSuite HMAC signature
    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(`POST|/api/webhooks/stopsuite-complete/|${timestamp}|${nonce}|${body}`)
      .digest("hex");

    if (expected !== hmacHeader) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      return res.status(401).send("Unauthorized");
    }

    // 3️⃣ Parse and log webhook
    const webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 StopSuite webhook received:", webhookData);

    if (webhookData?.event === "stop.completed" && webhookData?.stop) {
      const stop = webhookData.stop;

      console.log(`✅ Stop completed: stop.id=${stop.id}, order=${stop.order}`);

      // 4️⃣ Extract Shopify order ID from StopSuite external_reference
      const shopifyOrderId = stop.external_reference?.replace("shopify_", "");
      if (!shopifyOrderId) {
        console.warn("⚠️ Missing external_reference with Shopify order ID");
        return res.status(200).send("No Shopify ID found in stop.external_reference");
      }

      // 5️⃣ Fetch order details to get line_item IDs
      const orderUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}.json`;
      const orderResponse = await fetch(orderUrl, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN },
      });

      if (!orderResponse.ok) {
        const errText = await orderResponse.text();
        console.error("❌ Failed to fetch order from Shopify:", errText);
        return res.status(500).send("Error fetching order details");
      }

      const orderData = await orderResponse.json();
      const lineItems = orderData?.order?.line_items?.map((item) => ({ id: item.id })) || [];

      if (lineItems.length === 0) {
        console.warn("⚠️ No line_items found for order", shopifyOrderId);
        return res.status(200).send("No line items found, skipping fulfillment");
      }

      // 6️⃣ Create fulfillment payload
      const payload = {
        fulfillment: {
          location_id: Number(process.env.SHOPIFY_LOCATION_ID),
          notify_customer: true,
          tracking_number: null,
          line_items: lineItems,
        },
      };

      const fulfillmentUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillments.json`;
      const fulfillmentResponse = await fetch(fulfillmentUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const fulfillmentData = await fulfillmentResponse.json();
      console.log("✅ Shopify order fulfillment response:", fulfillmentData);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).send("Error");
  }
}

import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL =
  process.env.SHOPIFY_ADMIN_URL?.trim() ||
  "https://006sda-7b.myshopify.com/admin/api/2025-04";
const SHOPIFY_ADMIN_TOKEN =
  process.env.SHOPIFY_ADMIN_TOKEN?.trim() ||
  process.env.SHOPIFY_ADMIN_API_KEY?.trim();

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
    const signature = req.headers["x-signature"];
    const timestamp = req.headers["x-timestamp"];
    const nonce = req.headers["x-nonce"];
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // 2️⃣ Verify StopSuite HMAC signature
    const message = `POST|/api/webhooks/stopsuite-complete|${timestamp}|${nonce}|${body}`;
    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(message)
      .digest("hex");

    if (expected !== signature) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      console.warn("Expected:", expected);
      console.warn("Received:", signature);
      return res.status(401).send("Unauthorized");
    }

    // 3️⃣ Parse and log webhook
    const webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 StopSuite webhook verified successfully:", webhookData);

    if (webhookData?.event === "stop.completed" && webhookData?.stop) {
      const stop = webhookData.stop;
      console.log(`✅ Stop completed: stop.id=${stop.id}, order=${stop.order}`);

      // 4️⃣ Extract Shopify order ID
      const shopifyOrderId =
        webhookData.external_reference?.replace("shopify_", "") ||
        stop.external_reference?.replace("shopify_", "");
      if (!shopifyOrderId) {
        console.warn("⚠️ Missing external_reference with Shopify order ID");
        return res.status(200).send("No Shopify ID found");
      }

      // 5️⃣ Fetch order details
      const orderUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}.json`;
      const orderResponse = await fetch(orderUrl, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          Accept: "application/json",
        },
      });

      if (!orderResponse.ok) {
        const errText = await orderResponse.text();
        console.error("❌ Failed to fetch order from Shopify:", errText);
        return res
          .status(500)
          .json({ error: "Error fetching order details", raw: errText });
      }

      const orderData = await orderResponse.json();
      const lineItems =
        orderData?.order?.line_items?.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })) || [];

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

      // 7️⃣ Create fulfillment
      const fulfillmentUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillments.json`;
      const fulfillmentResponse = await fetch(fulfillmentUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json",
          Accept: "application/json", // ✅ Required for Shopify REST API
        },
        body: JSON.stringify(payload),
      });

      const text = await fulfillmentResponse.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text, status: fulfillmentResponse.status };
        console.warn("⚠️ Shopify returned non-JSON or empty response:", text);
      }

      console.log("✅ Shopify fulfillment response:", data);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).json({ error: err.message });
  }
}

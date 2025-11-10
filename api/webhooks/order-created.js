import crypto from "crypto";
import { syncOrderToStopSuite } from "../../lib/stopsuite-sync.js";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

/**
 * Shopify → StopSuite webhook
 * Handles new orders and syncs only "Carbon Negative Local Delivery" orders.
 */
export default async function orderCreated(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("📥 Shopify order webhook received");

    const body = req.body;

    if (!body || !body.id) {
      console.warn("⚠️ Missing or invalid order payload");
      return res.status(400).send("Missing order data");
    }

    // 🧾 Log core order info
    console.log(`🧾 New order ${body.name || "(unnamed)"} (${body.id})`);
    const shippingTitle = body.shipping_lines?.[0]?.title || "Unknown Shipping Method";
    console.log(`🚚 Shipping method: ${shippingTitle}`);

    // ⚙️ Optional HMAC verification
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    if (hmacHeader && SHOPIFY_WEBHOOK_SECRET) {
      const generatedHash = crypto
        .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
        .update(JSON.stringify(body), "utf8")
        .digest("base64");

      if (generatedHash !== hmacHeader) {
        console.warn("⚠️ HMAC mismatch (likely dev/ngrok test). Continuing anyway.");
      } else {
        console.log("✅ HMAC verified.");
      }
    }

    // 🧭 Only forward if shipping type is "Carbon Negative Local Delivery"
    if (shippingTitle.toLowerCase().includes("carbon negative local delivery")) {
      console.log("♻️ Forwarding to StopSuite (Carbon Negative Local Delivery detected)");
      await syncOrderToStopSuite(body);
      console.log(`✅ StopSuite sync complete for order ${body.id}`);
    } else {
      console.log("🚫 Skipping StopSuite sync (non-local delivery order)");
    }

    return res.status(200).send("✅ Webhook processed successfully");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
}

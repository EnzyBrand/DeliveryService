import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL?.trim();
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();

/**
 * StopSuite → Shopify webhook (Vercel)
 * Marks Shopify order fulfilled when StopSuite stop.completed event fires.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const timestamp = req.headers["x-timestamp"];
  const nonce = req.headers["x-nonce"];
  const signature = req.headers["x-signature"];
  const body = JSON.stringify(req.body);
  const message = `POST|/api/webhooks/stopsuite-complete/|${timestamp}|${nonce}|${body}`;
  const expected = crypto.createHmac("sha256", STOPSUITE_SECRET_KEY).update(message).digest("hex");

  if (signature !== expected) {
    console.warn("⚠️ Invalid StopSuite webhook signature");
    console.warn("Expected:", expected);
    console.warn("Received:", signature);
    return res.status(401).json({ error: "Invalid signature" });
  }

  const stop = req.body.stop;
  const driverAction = stop.driver_actions?.[0];
  const driverActionId = driverAction?.id;
  const driverNotes = driverAction?.notes || "";

  console.log("✅ Stop completed:", { stopId: stop.id, driverActionId, driverNotes });

  // 🧩 Try to extract Shopify order ID from StopSuite stop payload
  const externalRef =
    stop.external_reference ||
    stop.shop_order?.external_reference ||
    driverNotes.match(/shopify_(\d+)/)?.[1] ||
    null;

  if (!externalRef) {
    console.warn("⚠️ No Shopify reference found in StopSuite payload");
    return res.status(200).json({ message: "No Shopify reference found" });
  }

  const shopifyOrderId = externalRef.replace("shopify_", "");
  console.log(`🔗 Mapped to Shopify Order ID: ${shopifyOrderId}`);

  // 🛒 Fulfill Shopify order
  try {
    const response = await fetch(`${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillments.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        fulfillment: {
          location_id: 123456789, // replace with your location id
          tracking_numbers: [driverActionId.toString()],
          notify_customer: true,
        },
      }),
    });

    const data = await response.json();
    console.log("✅ Shopify fulfillment response:", data);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Shopify fulfillment error:", err);
    return res.status(500).json({ error: "Shopify API error" });
  }
}

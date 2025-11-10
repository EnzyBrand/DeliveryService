import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL?.trim();
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim();
const SHOPIFY_API_VERSION = "2025-10";

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
  const message = `POST|/api/webhooks/stopsuite-complete|${timestamp}|${nonce}|${body}`;
  const expected = crypto.createHmac("sha256", STOPSUITE_SECRET_KEY).update(message).digest("hex");

  if (signature !== expected) {
    console.warn("⚠️ Invalid StopSuite webhook signature");
    console.warn("Expected:", expected);
    console.warn("Received:", signature);
    return res.status(401).json({ error: "Invalid signature" });
  }

  console.log("📦 StopSuite webhook verified successfully:", req.body);

  const stop = req.body.stop;
  const driverAction = stop.driver_actions?.[0];
  const driverActionId = driverAction?.id || "NA";
  const driverNotes = driverAction?.notes || "";

  console.log("✅ Stop completed:", { stopId: stop.id, driverActionId, driverNotes });

  const externalRef =
    req.body.external_reference ||
    stop.external_reference ||
    driverNotes.match(/shopify_(\d+)/)?.[1] ||
    null;

  if (!externalRef) {
    console.warn("⚠️ No Shopify reference found in StopSuite payload");
    return res.status(200).json({ message: "No Shopify reference found" });
  }

  const shopifyOrderId = externalRef.replace("shopify_", "");
  console.log(`🔗 Mapped to Shopify Order ID: ${shopifyOrderId}`);

  try {
    // STEP 1️⃣: Fetch fulfillment orders
    const fulfillmentOrdersUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillment_orders.json`;
    const fulfillmentOrdersRes = await fetch(fulfillmentOrdersUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const fulfillmentOrdersData = await fulfillmentOrdersRes.json();
    const fulfillmentOrder = fulfillmentOrdersData.fulfillment_orders?.[0];

    if (!fulfillmentOrder) {
      throw new Error("No fulfillment orders found for this order.");
    }

    const fulfillmentOrderId = fulfillmentOrder.id;
    const lineItem = fulfillmentOrder.line_items?.[0];

    // STEP 2️⃣: Build payload
    const payload = {
      fulfillment: {
        location_id: fulfillmentOrder.assigned_location_id,
        tracking_info: {
          number: driverActionId.toString(),
          company: "Enzy Delivery",
          url: `https://demo4.stopsuite.com/stops/${stop.id}`,
        },
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id: fulfillmentOrderId,
            fulfillment_order_line_items: [
              {
                id: lineItem.id,
                quantity: lineItem.quantity,
              },
            ],
          },
        ],
        notify_customer: true,
      },
    };

    console.log("📦 Shopify Fulfillment Payload:", JSON.stringify(payload, null, 2));

    // STEP 3️⃣: Create fulfillment
    const fulfillmentUrl = `${SHOPIFY_ADMIN_URL}/fulfillments.json`;
    const response = await fetch(fulfillmentUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("✅ Shopify fulfillment response:", data);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("❌ Shopify fulfillment error:", err);
    return res.status(500).json({ error: err.message });
  }
}

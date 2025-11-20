import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();

const SHOPIFY_ADMIN_URL =
  process.env.SHOPIFY_ADMIN_URL?.trim() ||
  "https://006sda-7b.myshopify.com/admin/api/2025-04";

const SHOPIFY_ADMIN_TOKEN =
  process.env.SHOPIFY_ADMIN_TOKEN?.trim() ||
  process.env.SHOPIFY_ADMIN_API_KEY?.trim();

// ✅ Your Enzy fulfillment location ID
const SHOPIFY_LOCATION_ID = 74583474349;

/**
 * StopSuite → Shopify webhook (Vercel)
 * Marks Shopify order fulfilled when StopSuite stop.completed event fires.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    // 1️⃣ Extract headers
    const timestamp = req.headers["x-timestamp"];
    const nonce = req.headers["x-nonce"];
    const signature = req.headers["x-signature"];

    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // 2️⃣ Verify StopSuite HMAC signature
    const message = `POST|/api/webhooks/stopsuite-complete|${timestamp}|${nonce}|${body}`;
    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(message)
      .digest("hex");

    if (signature !== expected) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      console.warn("Expected:", expected);
      console.warn("Received:", signature);
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 3️⃣ Parse and log webhook
    const webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 StopSuite webhook verified successfully:", webhookData);

    if (webhookData?.event !== "stop.completed" || !webhookData?.stop) {
      return res.status(200).send("No stop.completed event found");
    }

    const stop = webhookData.stop;
    const driverAction = stop.driver_actions?.[0];
    const driverActionId = driverAction?.id || "NA";
    const driverNotes = driverAction?.notes || "";

    console.log("✅ Stop completed:", {
      stopId: stop.id,
      driverActionId,
      driverNotes,
    });

    // 4️⃣ Extract Shopify order ID
    const externalRef =
      webhookData.external_reference ||
      stop.external_reference ||
      driverNotes.match(/shopify_(\d+)/)?.[1] ||
      null;

    if (!externalRef) {
      console.warn("⚠️ No Shopify reference found in StopSuite payload");
      return res.status(200).json({ message: "No Shopify reference found" });
    }

    const shopifyOrderId = externalRef.replace("shopify_", "");
    console.log(`🔗 Mapped to Shopify Order ID: ${shopifyOrderId}`);

    // 5️⃣ Try to fetch fulfillment orders (preferred Shopify method)
    const fulfillmentOrdersUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillment_orders.json`;

    const fulfillmentOrdersRes = await fetch(fulfillmentOrdersUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const fulfillmentOrdersText = await fulfillmentOrdersRes.text();
    let fulfillmentOrdersData;

    try {
      fulfillmentOrdersData = JSON.parse(fulfillmentOrdersText);
    } catch {
      console.warn(
        "⚠️ Shopify returned non-JSON for fulfillment_orders:",
        fulfillmentOrdersText
      );
      fulfillmentOrdersData = {};
    }

    const fulfillmentOrder = fulfillmentOrdersData.fulfillment_orders?.[0];

    // 6️⃣ If fulfillment orders missing, fallback to classic order line items
    let lineItems = [];
    if (!fulfillmentOrder) {
      console.log(
        "📦 No fulfillment_orders found — using fallback /orders/{id}/fulfillments.json"
      );

      const orderUrl = `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}.json`;
      const orderRes = await fetch(orderUrl, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json",
        },
      });

      const orderData = await orderRes.json();

      lineItems =
        orderData?.order?.line_items?.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })) || [];
    }

    // 7️⃣ Build fulfillment payload (FIXED VERSION)
    const payload = fulfillmentOrder
      ? {
          fulfillment: {
            tracking_info: {
              number: driverActionId.toString(),
              company: "Enzy Delivery",
              url: `https://demo4.stopsuite.com/stops/${stop.id}`,
            },
            line_items_by_fulfillment_order: [
              { fulfillment_order_id: fulfillmentOrder.id },
            ],
            notify_customer: true,
          },
        }
      : {
          fulfillment: {
            location_id: SHOPIFY_LOCATION_ID,
            notify_customer: true,

            tracking_info: {
              number: driverActionId.toString(),
              company: "Enzy Delivery",
              url: `https://demo4.stopsuite.com/stops/${stop.id}`,
            },

            line_items: lineItems.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          },
        };

    // 8️⃣ Choose correct endpoint
    const fulfillmentUrl = fulfillmentOrder
      ? `${SHOPIFY_ADMIN_URL}/fulfillments.json`
      : `${SHOPIFY_ADMIN_URL}/orders/${shopifyOrderId}/fulfillments.json`;

    // 9️⃣ Send fulfillment request to Shopify
    const response = await fetch(fulfillmentUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText, status: response.status };
      console.warn("⚠️ Shopify returned non-JSON or empty response:", responseText);
    }

    console.log("✅ Shopify fulfillment response:", data);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("❌ Shopify fulfillment error:", err);
    return res.status(500).json({ error: err.message });
  }
}

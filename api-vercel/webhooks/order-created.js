import crypto from "crypto";
import fetch from "node-fetch";
import { syncOrderToStopSuite } from "../../lib/stopsuite-sync.js";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SHOPIFY_ADMIN_URL =
  process.env.SHOPIFY_ADMIN_URL?.trim() ||
  "https://006sda-7b.myshopify.com/admin/api/2025-04";
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_KEY?.trim();

/**
 * 🔍 Helper: check fulfillment orders & physical location
 */
async function checkFulfillmentStatus(orderId) {
  const graphql = `
    query {
      order(id: "gid://shopify/Order/${orderId}") {
        id
        name
        displayFinancialStatus
        displayFulfillmentStatus
        physicalLocation { id name }
        fulfillmentOrders(first: 5) {
          edges {
            node {
              id
              status
              assignedLocation { location { id name } }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(`${SHOPIFY_ADMIN_URL}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query: graphql }),
  });

  const data = await res.json();
  return data?.data?.order || null;
}

/**
 * Shopify → StopSuite webhook (Vercel)
 * Handles new orders and syncs them to StopSuite (customer, location, shop order)
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    console.log("📥 Shopify webhook received (Vercel)");
    const body = req.body;

    if (!body || !body.id) {
      console.warn("⚠️ Missing or invalid order payload");
      return res.status(400).send("Missing order data");
    }

    console.log(`🧾 Received new order ${body.name || "(unnamed)"} (${body.id})`);
    console.log("📍 Ship to:", body.shipping_address || "No shipping address");

    // HMAC validation (for completeness)
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];
    if (hmacHeader && SHOPIFY_WEBHOOK_SECRET) {
      const generatedHash = crypto
        .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
        .update(JSON.stringify(body), "utf8")
        .digest("base64");

      if (generatedHash !== hmacHeader) {
        console.warn("⚠️ HMAC mismatch (ignored for now)");
      } else {
        console.log("✅ HMAC verified successfully");
      }
    }

    /**
     * ⏳ Wait for Shopify order routing (fulfillment order creation)
     * Shopify sometimes needs 10–30 seconds to create fulfillmentOrders.
     */
    console.log(`⏳ Checking fulfillment orders for ${body.name} (${body.id})...`);
    let orderData = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      orderData = await checkFulfillmentStatus(body.id);
      if (
        orderData?.fulfillmentOrders?.edges?.length > 0 &&
        orderData.physicalLocation !== null
      ) {
        console.log(`✅ Fulfillment orders ready after ${attempt} check(s).`);
        break;
      }
      if (attempt < maxAttempts) {
        console.log(`⏱️ Attempt ${attempt}: No fulfillment orders yet — retrying in 10 s...`);
        await new Promise((r) => setTimeout(r, 10000));
      }
    }

    if (!orderData) {
      console.warn("⚠️ Could not retrieve order data from Shopify Admin API.");
    } else if (orderData.fulfillmentOrders.edges.length === 0) {
      console.warn(
        `🚨 Order ${body.name} has no fulfillmentOrders (physicalLocation may be null).`
      );
      console.warn(
        "🧭 Manual action required: Assign location in Shopify Admin to trigger fulfillment order creation."
      );
      // Optionally alert ops or log to a dashboard
      return res
        .status(202)
        .json({ message: "Awaiting Shopify routing – fulfillment skipped temporarily" });
    } else if (!orderData.physicalLocation) {
      console.warn(
        `⚠️ Order ${body.name} still missing physicalLocation, skipping StopSuite sync.`
      );
      return res
        .status(202)
        .json({ message: "Missing physicalLocation – manual check required" });
    }

    /**
     * ✅ Proceed with StopSuite sync
     */
    console.log(`🚀 Syncing order ${body.id} → StopSuite...`);
    await syncOrderToStopSuite(body);
    console.log(`✅ StopSuite sync complete for order ${body.id}`);

    return res.status(200).send("✅ Webhook processed successfully");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).send("Internal Server Error");
  }
}

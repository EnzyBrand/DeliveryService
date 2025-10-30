import crypto from "crypto";
import express from "express";
import { syncOrderToStopSuite } from "../../lib/stopsuite-sync.js";

const router = express.Router();
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

/**
 * Shopify → StopSuite webhook
 * Handles new orders and syncs them to StopSuite (customer, location, shop order, route)
 */
router.post("/order-created", express.json({ type: "*/*" }), async (req, res) => {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  const body = req.rawBody || JSON.stringify(req.body);

  console.log("📥 Raw webhook body received");
  console.log("📦 Headers:", req.headers);

  // ✅ Verify Shopify HMAC
  const generatedHash = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("base64");

  if (generatedHash !== hmacHeader) {
    console.warn("⚠️ Webhook signature mismatch – rejecting request.");
    return res.status(401).send("Unauthorized");
  }

  try {
    const order = req.body;
    console.log(`🧾 Received new order ${order.name} (${order.id})`);

    await syncOrderToStopSuite(order);

    res.status(200).send("✅ Webhook received successfully");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;

import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";

const router = express.Router();
const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY;
const SHOPIFY_ADMIN_URL = process.env.SHOPIFY_ADMIN_URL;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

/**
 * StopSuite → Shopify webhook
 * Marks Shopify order fulfilled when driver marks delivery complete.
 */
router.post("/stopsuite-complete", express.json({ type: "*/*" }), async (req, res) => {
  try {
    const hmacHeader = req.get("X-Signature");
    const timestamp = req.get("X-Timestamp");
    const nonce = req.get("X-Nonce");
    const body = JSON.stringify(req.body);

    // ✅ Verify HMAC
    const expected = crypto
      .createHmac("sha256", STOPSUITE_SECRET_KEY)
      .update(`POST|/api/webhooks/stopsuite-complete/|${timestamp}|${nonce}|${body}`)
      .digest("hex");

    if (expected !== hmacHeader) {
      console.warn("⚠️ Invalid StopSuite webhook signature");
      return res.status(401).send("Unauthorized");
    }

    console.log("📦 StopSuite webhook received:", req.body);

    if (req.body?.status === "complete" && req.body?.external_reference) {
      const shopifyOrderId = req.body.external_reference.replace("shopify_", "");

      // ✅ Mark Shopify order fulfilled
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

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    res.status(500).send("Error");
  }
});

export default router;

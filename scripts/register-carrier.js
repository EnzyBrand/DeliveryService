// register-carrier.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL, NGROK_URL } = process.env;

if (!SHOPIFY_ADMIN_API_KEY || !SHOPIFY_STORE_URL || !NGROK_URL) {
  console.error("❌ Missing required environment variables in .env file.");
  console.error("Make sure SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL, and NGROK_URL are set.");
  process.exit(1);
}

async function registerCarrier() {
  const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2025-10/carrier_services.json`;

  const payload = {
    carrier_service: {
      name: "Carbon Negative Local Delivery",
      callback_url: `${NGROK_URL}/api/shipping-rates`,
      service_discovery: true,
      format: "json",
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ Non-JSON response:", text);
    }

    if (!res.ok) {
      console.error(`❌ Shopify returned ${res.status}`);
      console.error(text);
      return;
    }

    console.log("✅ Carrier service registered successfully:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error registering carrier service:", err.message);
  }
}

registerCarrier();

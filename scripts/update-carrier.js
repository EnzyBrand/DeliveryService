// update-carrier.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL, VERCEL_PRODUCTION_URL, NGROK_URL } = process.env;

if (!SHOPIFY_ADMIN_API_KEY || !SHOPIFY_STORE_URL) {
  console.error("❌ Missing required environment variables in .env file.");
  console.error("Make sure SHOPIFY_ADMIN_API_KEY and SHOPIFY_STORE_URL are set.");
  process.exit(1);
}

// Use production URL if available, otherwise fall back to ngrok for local dev
const callbackBaseUrl = VERCEL_PRODUCTION_URL || NGROK_URL;

if (!callbackBaseUrl) {
  console.error("❌ No callback URL configured.");
  console.error("Set either VERCEL_PRODUCTION_URL (for production) or NGROK_URL (for local dev).");
  process.exit(1);
}

console.log(`🌐 Using callback URL: ${callbackBaseUrl}/api/shipping-rates`);
console.log(`📍 Environment: ${VERCEL_PRODUCTION_URL ? "Production (Vercel)" : "Local Development (ngrok)"}`);

async function updateCarrier(carrierId) {
  const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2025-10/carrier_services/${carrierId}.json`;

  const payload = {
    carrier_service: {
      callback_url: `${callbackBaseUrl}/api/shipping-rates`,
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: "PUT",
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

    console.log("✅ Carrier service updated successfully:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error updating carrier service:", err.message);
  }
}

// Get carrier ID from command line argument
const carrierId = process.argv[2];

if (!carrierId) {
  console.error("❌ Please provide a carrier service ID.");
  console.error("Usage: node scripts/update-carrier.js <carrier_id>");
  console.error("\nRun 'node scripts/list-carriers.js' to see available carrier IDs.");
  process.exit(1);
}

console.log(`🔄 Updating carrier service ID: ${carrierId}\n`);
updateCarrier(carrierId);

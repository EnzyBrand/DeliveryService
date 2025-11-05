import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL } = process.env;

// ✅ Safer: Require carrier ID as command-line argument
const CARRIER_ID = process.argv[2];

if (!CARRIER_ID) {
  console.error("❌ Usage: node scripts/delete-carrier.js <CARRIER_ID>");
  console.error("💡 Run 'node scripts/list-carriers.js' first to find the carrier ID");
  process.exit(1);
}

if (!SHOPIFY_ADMIN_API_KEY || !SHOPIFY_STORE_URL) {
  console.error("❌ Missing SHOPIFY_ADMIN_API_KEY or SHOPIFY_STORE_URL in .env");
  process.exit(1);
}

async function deleteCarrier() {
  console.log(`⚠️  About to delete carrier service ID: ${CARRIER_ID}`);
  console.log(`🏪 From store: ${SHOPIFY_STORE_URL}`);

  const url = `https://${SHOPIFY_STORE_URL}/admin/api/2025-10/carrier_services/${CARRIER_ID}.json`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) {
    console.log("✅ Carrier service deleted successfully.");
  } else {
    console.log("❌ Failed to delete carrier:", await res.text());
  }
}

deleteCarrier();

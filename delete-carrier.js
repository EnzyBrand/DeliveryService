import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL } = process.env;

// 👇 use the ID you found
const CARRIER_ID = "74343088301";

async function deleteCarrier() {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/2025-10/carrier_services/${CARRIER_ID}.json`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) {
    console.log("✅ Deleted old carrier successfully.");
  } else {
    console.log("❌ Failed to delete carrier:", await res.text());
  }
}

deleteCarrier();

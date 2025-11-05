import { stopSuiteRequest } from "../lib/stopsuite-sync.js";

console.log("🧪 Creating test shop order...");

const shopOrderPayload = {
  products: [
    { product_id: 34, quantity: 1, option_id: 0 },
    { product_id: 35, quantity: 2, option_id: 0 },
    { product_id: 36, quantity: 1, option_id: 0 },
  ],
  customer_location_id: 2000,
  delivery_notes: "Test order from Enzy → StopSuite integration",
};

console.log("📦 Creating StopSuite shop order:", JSON.stringify(shopOrderPayload, null, 2));

(async () => {
  try {
    const res = await stopSuiteRequest("POST", "/shop-orders/create/", shopOrderPayload);
    console.log("\n✅ Response:", res);
  } catch (err) {
    console.error("💥 Error creating shop order:", err);
  }
})();

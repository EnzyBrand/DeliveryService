import crypto from "crypto";

/**
 * Generates StopSuite-style HMAC headers for testing the Vercel webhook.
 *
 * Usage:
 *   node -r dotenv/config generate-signature.js
 */

const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
if (!STOPSUITE_SECRET_KEY) {
  console.error("❌ Missing STOPSUITE_SECRET_KEY in environment variables.");
  process.exit(1);
}

// 1️⃣ Example StopSuite webhook body — edit if needed for tests
const body = JSON.stringify({
  event: "stop.completed",
  external_reference: "shopify_6413199081645",
  stop: {
    id: 187772,
    customer_location: 977,
    driver_actions: [],
    driver_images: [],
    flags: [],
    notes: "",
    order: 5,
    route: { id: 1234, name: "Test Route" },
    service_records: [],
    status: "complete",
    timestamp: new Date().toISOString(),
  },
});

// 2️⃣ Create signature components
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomUUID();

// ⚙️ IMPORTANT — must match deployed Vercel endpoint exactly (no trailing slash)
const message = `POST|/api/webhooks/stopsuite-complete|${timestamp}|${nonce}|${body}`;

// 3️⃣ Generate signature
const signature = crypto
  .createHmac("sha256", STOPSUITE_SECRET_KEY)
  .update(message)
  .digest("hex");

// 4️⃣ Output everything cleanly for Postman
console.log("\n✅ COPY THESE VALUES INTO POSTMAN:\n");
console.log("X-Timestamp:", timestamp);
console.log("X-Nonce:", nonce);
console.log("X-Signature:", signature);

console.log("\n📦 Body sent to endpoint:\n", body);
console.log("\n📬 Message string used for HMAC:\n", message);

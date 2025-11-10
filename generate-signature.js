import crypto from "crypto";

/**
 * Generates StopSuite-style HMAC headers for testing the Vercel webhook.
 *
 * Usage:
 *   node generate-signature.js
 */
const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();
if (!STOPSUITE_SECRET_KEY) {
  console.error("❌ Missing STOPSUITE_SECRET_KEY in environment variables.");
  process.exit(1);
}

// 1️⃣ Build a realistic StopSuite webhook body
const body = JSON.stringify({
  event: "stop.completed",
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

// ⚙️ IMPORTANT — must match the deployed endpoint path exactly (NO trailing slash)
const message = `POST|/api/webhooks/stopsuite-complete|${timestamp}|${nonce}|${body}`;

// 3️⃣ Generate signature
const signature = crypto
  .createHmac("sha256", STOPSUITE_SECRET_KEY)
  .update(message)
  .digest("hex");

// 4️⃣ Output values for Postman
console.log("\n✅ COPY THESE VALUES INTO POSTMAN:\n");
console.log("X-Timestamp:", timestamp);
console.log("X-Nonce:", nonce);
console.log("X-Signature:", signature);

console.log("\n📦 Body sent to endpoint:\n", body);
console.log("\n📬 Message string used for HMAC:\n", message);

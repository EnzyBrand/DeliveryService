/**
 * 🧾 StopSuite Signature Generator
 * Use this file to manually generate valid HMAC headers (X-Timestamp, X-Nonce, X-Signature)
 * for testing the production webhook endpoint on Vercel:
 *    https://delivery-service-umber.vercel.app/api/webhooks/stopsuite-complete
 */

import crypto from "crypto";

// ⚙️ Replace this with your actual StopSuite secret key from Vercel (.env)
const STOPSUITE_SECRET_KEY = "YOUR_STOPSUITE_SECRET_KEY_HERE";

// 🕒 Current UNIX timestamp (in seconds)
const timestamp = Math.floor(Date.now() / 1000).toString();

// 🧩 Unique nonce for this request
const nonce = crypto.randomUUID();

// 📨 Example webhook body (adjust order ID or fields if needed)
const body = JSON.stringify({
  status: "complete",
  external_reference: "shopify_1234567890", // test order ID
  driver: "Test Driver",
  notes: "Delivered successfully",
  timestamp: "2025-11-09T15:30:00Z"
});

// 🧠 Critical: path must include trailing slash “/” — matches production handler
const message = `POST|/api/webhooks/stopsuite-complete|${timestamp}|${nonce}|${body}`;

// 🔐 Generate HMAC SHA256 signature
const signature = crypto
  .createHmac("sha256", STOPSUITE_SECRET_KEY)
  .update(message, "utf8")
  .digest("hex");

// ✅ Print results
console.log("\n✅ COPY THESE VALUES INTO POSTMAN:\n");
console.log("X-Timestamp:", timestamp);
console.log("X-Nonce:", nonce);
console.log("X-Signature:", signature);

console.log("\n📦 Body sent to endpoint:\n", body);
console.log("\n📬 Message string used for HMAC:\n", message);

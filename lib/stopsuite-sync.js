import "dotenv/config";
import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_BASE_URL = "https://demo4.stopsuite.com/api/client/";
const STOPSUITE_API_KEY = process.env.STOPSUITE_API_KEY?.trim();
const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();

console.log("🔗 Using StopSuite base URL:", STOPSUITE_BASE_URL);

/**
 * 🔐 Generate StopSuite HMAC signature (METHOD|PATH|TIMESTAMP|NONCE|BODY)
 */
function generateSignature(method, path, body = "") {
  if (!STOPSUITE_SECRET_KEY) throw new Error("❌ Missing STOPSUITE_SECRET_KEY in .env");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();

  let normalizedPath = path.startsWith("/api/client/")
    ? path
    : `/api/client${path.startsWith("/") ? path : `/${path}`}`;
  if (!normalizedPath.endsWith("/")) normalizedPath += "/";

  const message = `${method}|${normalizedPath}|${timestamp}|${nonce}|${body}`;
  const signature = crypto
    .createHmac("sha256", STOPSUITE_SECRET_KEY)
    .update(message, "utf8")
    .digest("hex");

  return { timestamp, nonce, signature };
}

/**
 * 🌐 Generic StopSuite API request wrapper
 */
export async function stopSuiteRequest(method, path, bodyObj = null) {
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  const { timestamp, nonce, signature } = generateSignature(method, path, body);

  const sanitizedPath = path
    .replace(/^\/+/, "")
    .replace(/^api\/client\//, "")
    .replace(/\/+$/, "");

  const url = `${STOPSUITE_BASE_URL}${sanitizedPath}/`;

  const headers = {
    "X-API-Key": STOPSUITE_API_KEY,
    "X-Signature": signature,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  console.log(`\n🌐 StopSuite ${method} ${url}`);
  if (body) console.log("📦 Body:", body);

  const res = await fetch(url, { method, headers, body: body || undefined });
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    console.log(`✅ StopSuite responded (${res.status})`, json);
    return json;
  } catch {
    console.warn(`⚠️ Non-JSON response (${res.status})`, text.slice(0, 200));
    return { raw: text, status: res.status };
  }
}

/**
 * 🏷️ Tag StopSuite customer with Enzy tag (ID 197)
 */
async function tagCustomer(customerId) {
  try {
    const tagPayload = { customer: customerId, tag: 197 };
    console.log(`🏷️  Adding Enzy tag to customer ${customerId}...`);
    const tagRes = await stopSuiteRequest("POST", "/customers/add-tag/", tagPayload);

    if (tagRes?.customer_id) {
      console.log(`✅ Customer ${tagRes.customer_id} tagged with Enzy (tag 197)`);
    } else {
      console.warn("⚠️ Tagging may have failed:", tagRes);
    }
  } catch (err) {
    console.error("💥 Failed to tag customer:", err);
  }
}

/**
 * 🔄 Shopify → StopSuite sync (customer → location → shop order → tag)
 */
export async function syncOrderToStopSuite(order) {
  console.log(`🔄 Syncing order ${order.name} (${order.id}) to StopSuite...`);

  try {
    // 1️⃣ Create / Sync Customer
    const customerPayload = {
      name: `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim(),
      contact_name: order.customer?.first_name || "",
      email: order.email || order.customer?.email || "",
      phone: order.customer?.phone || "",
      billing_address: order.billing_address?.address1 || "",
      billing_city: order.billing_address?.city || "",
      billing_state: order.billing_address?.province || "",
      billing_zip: order.billing_address?.zip || "",
      billing_method: "manual",
      notes: `Shopify Order ${order.name}`,
    };

    const customerRes = await stopSuiteRequest("POST", "/customers/create/", customerPayload);
    if (!customerRes?.id) throw new Error("Failed to create StopSuite customer");
    const customerId = customerRes.id;
    console.log("✅ StopSuite customer created:", customerId);

    // 2️⃣ Add Enzy tag
    await tagCustomer(customerId);

    // 3️⃣ Create / Sync Customer Location
    const shipping = order.shipping_address || order.billing_address;
    if (!shipping) throw new Error("No shipping address on order");

    const locationPayload = {
      customer: customerId,
      address: shipping.address1 || "",
      city: shipping.city || "",
      state: shipping.province || "",
      zip: shipping.zip || "",
      position: { lat: shipping.latitude || 0, lng: shipping.longitude || 0 },
      nickname: "Shopify Default",
      status: "active",
    };

    const locationRes = await stopSuiteRequest("POST", "/customer-locations/create/", locationPayload);
    if (!locationRes?.id) throw new Error("Failed to create StopSuite location");
    const customerLocationId = locationRes.id;
    console.log("✅ StopSuite location created:", customerLocationId);

    // 4️⃣ Create Shop Order
    const shopOrderPayload = {
      products: order.line_items.map((item) => ({
        product_id: 34, // StopSuite product ID for Enzy deliveries
        quantity: item.quantity,
        option_id: 0,
      })),
      customer_location_id: customerLocationId,
      delivery_notes: order.note || `Shopify Order ${order.name}`,
    };

    console.log("📦 Creating StopSuite shop order:", shopOrderPayload);
    const shopOrderRes = await stopSuiteRequest("POST", "/shop-orders/create/", shopOrderPayload);
    const shopOrderId = shopOrderRes.id;
    console.log("✅ StopSuite shop order created:", shopOrderId);

    console.log(`🎉 StopSuite sync complete for order ${order.name}`);
  } catch (err) {
    console.error("💥 StopSuite sync failed:", err);
  }
}

/**
 * 🧪 CLI test helper
 */
if (process.argv[1] && process.argv[1].endsWith("stopsuite-sync.js")) {
  (async () => {
    console.log("🧪 Testing StopSuite connection...");
    try {
      const res = await stopSuiteRequest("GET", "/services/");
      console.log("🧾 Services list:", res);
    } catch (err) {
      console.error("💥 Fetch failed:", err);
    }
  })();
}

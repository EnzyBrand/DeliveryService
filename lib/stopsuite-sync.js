import "dotenv/config";
import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_BASE_URL = "https://demo4.stopsuite.com/api/client/";
const STOPSUITE_API_KEY = process.env.STOPSUITE_API_KEY?.trim();
const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY?.trim();

// Shopify SKUs → StopSuite Product IDs (Compost Nashville only)
const PRODUCT_MAP = {
  "100ENZYNASH": 34,   // 100ml Bottle
  "300ENZYNASH": 35,   // 300ml Bottle
  "500ENZYNASH": 36    // 500ml Bottle
};

console.log("🔗 Using StopSuite base URL:", STOPSUITE_BASE_URL);

/**
 * HMAC helper
 */
function generateSignature(method, path, body = "") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();

  let normalizedPath = path.startsWith("/api/client/")
    ? path
    : `/api/client${path.startsWith("/") ? path : `/${path}`}`;

  if (!normalizedPath.endsWith("/")) normalizedPath += "/";

  const message = `${method}|${normalizedPath}|${timestamp}|${nonce}|${body}`;
  const signature = crypto
    .createHmac("sha256", STOPSUITE_SECRET_KEY)
    .update(message)
    .digest("hex");

  return { timestamp, nonce, signature };
}

/**
 * StopSuite request wrapper
 */
async function stopSuiteRequest(method, path, bodyObj = null) {
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

  const res = await fetch(url, {
    method,
    headers,
    body: body || undefined
  });

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
 * Tag customer with Enzy tag in StopSuite
 */
async function tagCustomer(customerId) {
  try {
    const tagPayload = { customer: customerId, tag: 197 };
    console.log(`🏷️ Adding Enzy tag to customer ${customerId}...`);
    const tagRes = await stopSuiteRequest("POST", "/customers/add-tag/", tagPayload);

    if (tagRes?.customer_id) {
      console.log(`✅ Customer ${tagRes.customer_id} tagged with Enzy`);
    } else {
      console.warn("⚠️ Tagging may have failed:", tagRes);
    }
  } catch (err) {
    console.error("💥 Failed to tag customer:", err);
  }
}

/**
 * Main sync function — Shopify Order → StopSuite
 */
export async function syncOrderToStopSuite(order) {
  const shippingTitle = order.shipping_lines?.[0]?.title?.toLowerCase() || "";

  // Only sync *local delivery* orders
  if (!shippingTitle.includes("carbon negative local delivery")) {
    console.log("🚫 Skipping (non-local delivery order)");
    return;
  }

  console.log(`🔄 Syncing Shopify order ${order.name} (${order.id}) → StopSuite…`);

  try {
    // 1️⃣ Create Customer
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
    console.log("✅ StopSuite customer:", customerId);

    // 2️⃣ Tag customer
    await tagCustomer(customerId);

    // 3️⃣ Create Location
    const shipping = order.shipping_address || order.billing_address;
    if (!shipping) throw new Error("No shipping address on order");

    const locationPayload = {
      customer: customerId,
      address: shipping.address1,
      city: shipping.city,
      state: shipping.province,
      zip: shipping.zip,
      position: { lat: shipping.latitude || 0, lng: shipping.longitude || 0 },
      nickname: "Shopify Default",
      status: "active",
    };

    const locationRes = await stopSuiteRequest("POST", "/customer-locations/create/", locationPayload);
    if (!locationRes?.id) throw new Error("Failed to create StopSuite location");

    const customerLocationId = locationRes.id;
    console.log("🏠 StopSuite location:", customerLocationId);

    // 4️⃣ Map line items → StopSuite products
    const stopSuiteProducts = order.line_items.map((item) => {
      const ssProduct = PRODUCT_MAP[item.sku];

      if (!ssProduct) {
        console.warn(`⚠️ No StopSuite product match for SKU ${item.sku}`);
      }

      return {
        product_id: ssProduct,
        quantity: item.quantity,
        option_id: 0
      };
    });

    // 5️⃣ Create Shop Order (NO route — StopSuite auto-assigns)
    const shopOrderPayload = {
      products: stopSuiteProducts,
      customer_location_id: customerLocationId,
      delivery_notes: order.note || `Shopify Order ${order.name}`,
      external_reference: `shopify_${order.id}`,
      service: "Delivery"
    };

    console.log("📦 Creating StopSuite shop order:", shopOrderPayload);

    const shopOrderRes = await stopSuiteRequest("POST", "/shop-orders/create/", shopOrderPayload);
    if (!shopOrderRes?.id) throw new Error("Failed to create StopSuite shop order");

    console.log(`🎉 StopSuite shop order created: ${shopOrderRes.id}`);

  } catch (err) {
    console.error("💥 StopSuite sync failed:", err);
  }
}

/**
 * Optional: CLI test
 */
if (process.argv[1]?.endsWith("stopsuite-sync.js")) {
  (async () => {
    console.log("🧪 Testing StopSuite connection...");
    try {
      const res = await stopSuiteRequest("GET", "/services/");
      console.log("🧾 Services:", res);
    } catch (err) {
      console.error("💥 Fetch failed:", err);
    }
  })();
}

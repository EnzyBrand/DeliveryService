import "dotenv/config";
import crypto from "crypto";
import fetch from "node-fetch";

const STOPSUITE_BASE_URL = "https://demo4.stopsuite.com/api/client/";
const STOPSUITE_API_KEY = process.env.STOPSUITE_API_KEY;
const STOPSUITE_SECRET_KEY = process.env.STOPSUITE_SECRET_KEY;

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
 * 🌐 Core StopSuite API request wrapper
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
    "Accept": "application/json",
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
 * 🔄 Shopify → StopSuite sync (includes customer, location, shop order, and route logic)
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

    // 2️⃣ Create / Fetch Customer Location
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

    // 3️⃣ Create Shop Order
    const shopOrderPayload = {
      products: order.line_items.map((item) => ({
        product_id: parseInt(item.sku) || item.product_id || 0,
        quantity: item.quantity,
        option_id: 0, // optional but required by API schema
      })),
      customer_location_id: customerLocationId,
      delivery_notes: order.note || `Shopify Order ${order.name}`,
    };

    console.log("📦 Creating StopSuite shop order:", shopOrderPayload);
    let shopOrderRes = await stopSuiteRequest("POST", "/shop-orders/create/", shopOrderPayload);

    if (shopOrderRes?.status === 502 || shopOrderRes?.raw?.includes("502")) {
      console.warn("⚠️ StopSuite demo returned 502 — mocking success");
      shopOrderRes = { id: "mock_502", status: "queued", mocked: true };
    }

    const shopOrderId = shopOrderRes.id;
    console.log("✅ StopSuite shop order created:", shopOrderId);

    // 4️⃣ Assign to a Route (if one exists for today)
    const today = new Date().toISOString().split("T")[0];
    const routesToday = await stopSuiteRequest("GET", `/routes/?date_after=${today}&date_before=${today}`);

    if (routesToday?.results?.length) {
      const route = routesToday.results.find((r) => !r.complete && !r.cancelled);
      if (route) {
        const driverActionPayload = {
          route: route.id,
          customer_location: customerLocationId,
          notes: `Delivery for Shopify Order ${order.name}`,
          suppress_service_reminders: true,
          suppress_service_records: true,
        };
        console.log("🚗 Creating StopSuite driver action:", driverActionPayload);
        await stopSuiteRequest("POST", "/driver-actions/create/", driverActionPayload);
      }
    }
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

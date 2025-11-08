import fetch from "node-fetch";
import crypto from "crypto";

const STOPSUITE_API = "https://demo4.stopsuite.com/api/check-service-area/";

// Lazy getters for env vars (so they're read at runtime, not module load time)
const getApiKey = () => process.env.STOPSUITE_API_KEY?.trim();
const getSecretKey = () => process.env.STOPSUITE_SECRET_KEY?.trim();

function generateSignature(method, path, timestamp, nonce, body) {
  const message = `${method}|${path}|${timestamp}|${nonce}|${body}`;
  return crypto
    .createHmac("sha256", getSecretKey())
    .update(message)
    .digest("hex");
}

async function tryStopSuiteRequest(lat, lng) {
  const payloadObj = { lat, lng };
  const payload = JSON.stringify(payloadObj);
  const method = "POST";
  const path = "/api/check-service-area/";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const signature = generateSignature(method, path, timestamp, nonce, payload);

  console.log("🧾 Sending StopSuite payload:", payloadObj);

  try {
    const res = await fetch(STOPSUITE_API, {
      method,
      headers: {
        "X-API-Key": getApiKey(),
        "X-Signature": signature,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "Content-Type": "application/json",
      },
      body: payload,
    });

    const text = await res.text();
    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ Non-JSON response from StopSuite:", text);
    }

    if (res.ok) {
      console.log(`✅ HTTP ${res.status} from StopSuite`);
      return data || {};
    }

    console.error(`❌ StopSuite responded ${res.status}:`, text);
    return null;
  } catch (err) {
    console.error("❌ Error reaching StopSuite:", err.message);
    return null;
  }
}

export async function validateDeliveryZone(lat, lng) {
  if (!getApiKey() || !getSecretKey()) {
    console.warn("⚠️ Missing StopSuite API keys!");
    return { inside: false };
  }

  console.log(`📍 Checking StopSuite service area for (${lat}, ${lng})...`);

  const response = await tryStopSuiteRequest(lat, lng);
  if (response) return handleResponse(response, lat, lng);

  console.log(`🚫 Coordinate (${lat}, ${lng}) is outside all service zones`);
  return { inside: false };
}

function handleResponse(data, lat, lng) {
  console.log("🗺️ StopSuite response:", data);

  if (data?.service_area?.name) {
    const zoneName = data.service_area.name;
    console.log(`✅ Coordinate (${lat}, ${lng}) is within zone: ${zoneName}`);
    return { inside: true, zoneName };
  }

  console.log(`🚫 Coordinate (${lat}, ${lng}) is outside all service zones`);
  return { inside: false };
}

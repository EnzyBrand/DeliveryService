// /api/routes/fetch-active.js
import fetch from "node-fetch";
import crypto from "crypto";
import { STOPSUITE_BASE_URL } from "../../dev-carrier-server.js";

const API_KEY = process.env.STOPSUITE_API_KEY;
const SECRET_KEY = process.env.STOPSUITE_SECRET_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function signStopSuiteRequest(method, path, body = "") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();

  const normalizedPath = path.startsWith("/api/client/")
    ? path
    : `/api/client${path.startsWith("/") ? path : `/${path}`}`;

  const message = `${method}|${normalizedPath}|${timestamp}|${nonce}|${body}`;
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(message, "utf8")
    .digest("hex");

  return { signature, timestamp, nonce };
}

export default async function fetchActiveRoutes(req, res) {
  try {
    // --- STEP 1: Fetch route list ---
    const { signature, timestamp, nonce } = signStopSuiteRequest("GET", "/routes/");
    const listHeaders = {
      "X-API-Key": API_KEY,
      "X-Signature": signature,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      Accept: "application/json",
    };

    const routesResponse = await fetch(`${STOPSUITE_BASE_URL}routes/`, { headers: listHeaders });
    const routesData = await routesResponse.json();

    if (!Array.isArray(routesData.results)) {
      console.error("⚠️ Unexpected route list structure:", routesData);
      return res.status(500).json({ error: "Invalid route list response" });
    }

    const allRoutes = routesData.results;
    const activeRoutes = allRoutes.filter((r) => !r.complete && !r.cancelled);
    console.log(`🧭 Found ${activeRoutes.length} active routes`);

    // --- STEP 2: Fetch details for each route (each signed individually) ---
    const BATCH_SIZE = 5;
    const detailedRoutes = [];

    for (let i = 0; i < activeRoutes.length; i += BATCH_SIZE) {
      const batch = activeRoutes.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (r) => {
          const path = `/routes/${r.id}/`;
          const { signature, timestamp, nonce } = signStopSuiteRequest("GET", path);

          const headers = {
            "X-API-Key": API_KEY,
            "X-Signature": signature,
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            Accept: "application/json",
          };

          const response = await fetch(`${STOPSUITE_BASE_URL}routes/${r.id}/`, { headers });
          const data = await response.json();
          return data;
        })
      );

      batchResults.forEach((r) => {
        if (r.status === "fulfilled" && !r.value.detail) {
          detailedRoutes.push(r.value);
        }
      });

      console.log(`✅ Processed batch ${Math.ceil(i / BATCH_SIZE) + 1}`);
      await sleep(200);
    }

    return res.status(200).json({ routes: detailedRoutes });
  } catch (error) {
    console.error("❌ Error fetching routes:", error);
    return res.status(500).json({ error: error.message });
  }
}

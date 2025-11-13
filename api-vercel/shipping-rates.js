import { validateDeliveryZone } from "../api/zone-validator.js";
import { geocodeAddress } from "../lib/geocode.js";

/**
 * Shopify CarrierService endpoint (Vercel serverless)
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const requestId = Date.now().toString();
  console.log(`\n[${requestId}] 📨 Shipping rate request received (Vercel)`);

  try {
    const { rate } = req.body;
    if (!rate || !rate.destination) {
      console.log(`[${requestId}] ⚠️ Invalid request format — no destination`);
      return res.json({ rates: [] });
    }

    const { destination } = rate;
    const address = {
      street: `${destination.address1 || ""} ${destination.address2 || ""}`.trim(),
      city: destination.city,
      state: destination.province,
      zip: destination.postal_code || destination.zip,
      country: destination.country,
    };

    console.log(`[${requestId}] 📍 Address:`, address);
    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;

    const coordinates = await geocodeAddress(fullAddress);
    if (!coordinates) {
      console.log(`[${requestId}] ⚠️ Could not geocode address`);
      return res.json({ rates: [] });
    }

    const zoneResult = await validateDeliveryZone(coordinates.lat, coordinates.lng);

    if (zoneResult?.inside) {
      console.log(`[${requestId}] ✅ Inside StopSuite zone (${zoneResult.zoneName || "Unnamed Zone"})`);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Shopify-Carrier-Exclusive", "true");

      return res.json({
        rates: [
          {
            service_name: "Carbon Negative Local Delivery",
            service_code: "CARBON_NEGATIVE_LOCAL",
            total_price: "499",
            currency: "USD",
            location_id: "81390698669",        //  <-- REQUIRED FIX
            min_delivery_date: getDeliveryDate(1),
            max_delivery_date: getDeliveryDate(2),
          },
        ],
      });
    }

    console.log(`[${requestId}] 🚫 Outside StopSuite zone`);
    return res.json({ rates: [] });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error.message);
    return res.json({ rates: [] });
  }
}

function getDeliveryDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

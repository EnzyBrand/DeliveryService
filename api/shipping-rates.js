import { validateDeliveryZone } from './zone-validator.js';
import { geocodeAddress } from '../lib/geocode.js';

/**
 * Shopify CarrierService endpoint
 * Determines if address is in StopSuite local delivery zone
 * and returns Carbon Negative Local Delivery rate if matched.
 * Otherwise, defers to Shopify’s default $4.99 rate.
 */
export default async function handler(req, res) {
  // --- CORS setup ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = Date.now().toString();
  console.log(`\n[${requestId}] 📨 Shipping rate request received`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { rate } = req.body;
    if (!rate || !rate.destination) {
      console.log(`[${requestId}] ⚠️ Invalid request format — no destination`);
      return res.json({ rates: [] }); // Shopify shows default rates
    }

    const { destination } = rate;
    const address = {
      street: `${destination.address1 || ''} ${destination.address2 || ''}`.trim(),
      city: destination.city,
      state: destination.province,
      zip: destination.postal_code || destination.zip,
      country: destination.country,
    };

    console.log(`[${requestId}] 📍 Processing address:`, address);
    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;
    console.log(`[${requestId}] 🗺️ Geocoding started for: ${fullAddress}`);

    const coordinates = await geocodeAddress(fullAddress);
    if (!coordinates) {
      console.log(`[${requestId}] ⚠️ Could not geocode address — falling back to Shopify defaults`);
      return res.json({ rates: [] }); // Shopify default
    }

    console.log(`[${requestId}] ✅ Coordinates found:`, coordinates);

    const zoneResult = await validateDeliveryZone(coordinates.lat, coordinates.lng);

    // ✅ Inside StopSuite zone
    if (zoneResult?.inside) {
      console.log(`[${requestId}] ✅ Address is INSIDE StopSuite zone (${zoneResult.zoneName || 'Unnamed Zone'})`);
      console.log(`[${requestId}] Returning ONLY Carbon Negative Local Delivery rate\n`);

      // 🚫 Prevent Shopify from merging default rates
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Shopify-Carrier-Exclusive', 'true');

      return res.json({
        rates: [
          {
            service_name: "Carbon Negative Local Delivery",
            service_code: "CARBON_NEGATIVE_LOCAL",
            total_price: "499", // $4.99 (Shopify uses cents)
            currency: "USD",
            min_delivery_date: getDeliveryDate(1),
            max_delivery_date: getDeliveryDate(2),
          },
        ],
      });
    }

    // 🚫 Outside StopSuite polygon — Shopify will show built-in $4.99 default
    console.log(`[${requestId}] 🚫 Outside StopSuite zones — deferring to Shopify’s default $4.99 rate`);
    return res.json({ rates: [] });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error processing shipping rates:`, error.message);
    // Fallback to Shopify’s native shipping rate if something breaks
    return res.json({ rates: [] });
  }
}

/**
 * Helper: Calculate delivery date offset
 */
function getDeliveryDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}


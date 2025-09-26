import { validateDeliveryZone } from '../helpers/zone-validator.js';
import { geocodeAddress } from '../helpers/geocoding.js';

/**
 * Main endpoint called by Shopify during checkout
 * Receives shipping address and returns available rates
 */
export async function handleShippingRates(req, res) {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Shipping rate request received`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { rate } = req.body;

    // Validate request
    if (!rate || !rate.destination) {
      console.log(`[${requestId}] Invalid request format`);
      return res.json({ rates: getDefaultRates() });
    }

    const { destination, items } = rate;

    // Build address object
    const address = {
      street: `${destination.address1 || ''} ${destination.address2 || ''}`.trim(),
      city: destination.city,
      state: destination.province,
      zip: destination.postal_code,
      country: destination.country
    };

    console.log(`[${requestId}] Processing address:`, address);

    // Step 1: Try to geocode the address
    const coordinates = await geocodeAddress(address);

    if (!coordinates) {
      console.log(`[${requestId}] Could not geocode address, returning default rates`);
      return res.json({ rates: getDefaultRates() });
    }

    console.log(`[${requestId}] Coordinates found:`, coordinates);

    // Step 2: Check if coordinates are in Nashville delivery zone
    const isInDeliveryZone = await validateDeliveryZone(
      coordinates.lat,
      coordinates.lng
    );

    console.log(`[${requestId}] In delivery zone:`, isInDeliveryZone);

    // Step 3: Build response rates
    const rates = [];

    if (isInDeliveryZone) {
      // Add free Nashville compost option
      rates.push({
        service_name: "Free Shipping with Nashville Compost",
        service_code: "NASH_COMPOST_FREE",
        total_price: "0",  // Free shipping (price in cents as string)
        description: "Eco-friendly delivery with composting service",
        currency: "USD",
        min_delivery_date: getDeliveryDate(2),
        max_delivery_date: getDeliveryDate(5)
      });
    }

    // Always include standard shipping
    rates.push(...getDefaultRates());

    console.log(`[${requestId}] Returning ${rates.length} rates`);
    res.json({ rates });

  } catch (error) {
    console.error(`[${requestId}] Error processing shipping rates:`, error.message);
    // On any error, return standard shipping to avoid checkout failure
    res.json({ rates: getDefaultRates() });
  }
}

/**
 * Default shipping rates always available
 */
function getDefaultRates() {
  return [{
    service_name: "Standard Shipping",
    service_code: "STANDARD",
    total_price: "999",  // $9.99 in cents
    description: "Standard delivery",
    currency: "USD",
    min_delivery_date: getDeliveryDate(5),
    max_delivery_date: getDeliveryDate(7)
  }];
}

/**
 * Calculate delivery date
 */
function getDeliveryDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}
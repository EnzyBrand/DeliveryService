import axios from 'axios';

/**
 * Registers the carrier service with Shopify
 * This tells Shopify to call our shipping-rates endpoint during checkout
 */
export async function registerCarrierService(req, res) {
  const { shop, accessToken } = req.body;

  if (!shop || !accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing shop or accessToken'
    });
  }

  const carrierServiceData = {
    carrier_service: {
      name: "Nashville Compost Delivery",
      callback_url: `${process.env.APP_URL}/api/shipping-rates`,
      service_discovery: true,
      active: true,
      carrier_service_type: "api",
      format: "json"
    }
  };

  try {
    // First check if service already exists
    const existing = await listCarrierServices(shop, accessToken);
    const nashvilleService = existing.find(s => s.name === "Nashville Compost Delivery");

    if (nashvilleService) {
      console.log('CarrierService already exists:', nashvilleService.id);
      return res.status(200).json({
        success: true,
        carrier_service_id: nashvilleService.id,
        message: 'Service already registered'
      });
    }

    // Register new service
    const response = await axios.post(
      `https://${shop}/admin/api/2024-01/carrier_services.json`,
      carrierServiceData,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('CarrierService registered successfully:', response.data.carrier_service.id);
    res.status(200).json({
      success: true,
      carrier_service_id: response.data.carrier_service.id
    });
  } catch (error) {
    console.error('CarrierService registration failed:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Lists all carrier services for a shop
 */
export async function listCarrierServices(shop, accessToken) {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2024-01/carrier_services.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      }
    );
    return response.data.carrier_services || [];
  } catch (error) {
    console.error('Failed to list carrier services:', error.message);
    return [];
  }
}
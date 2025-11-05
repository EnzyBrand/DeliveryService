# Development & Testing Scripts

This folder contains utility scripts for local development and testing. **These scripts are NOT deployed to production.**

## 🛠️ Shopify Carrier Service Management

### List Carrier Services
Lists all registered carrier services for your Shopify store.

```bash
npm run carrier:list
# or
node scripts/list-carriers.js
```

### Register Carrier Service
Registers the Carbon Negative Local Delivery carrier service with Shopify.

**Prerequisites:**
- Set `NGROK_URL` in `.env` (your ngrok tunnel URL)
- Set `SHOPIFY_ADMIN_API_KEY` and `SHOPIFY_STORE_URL` in `.env`

```bash
npm run carrier:register
# or
node scripts/register-carrier.js
```

### Delete Carrier Service
Deletes a specific carrier service by ID.

**⚠️ Warning:** This is a destructive operation!

```bash
npm run carrier:delete <CARRIER_ID>
# or
node scripts/delete-carrier.js <CARRIER_ID>
```

**Example:**
```bash
# First, find the carrier ID
npm run carrier:list

# Then delete it
npm run carrier:delete 74343088301
```

---

## 🧪 StopSuite Testing Scripts

### Test StopSuite Products
Fetches the list of available shop products from StopSuite.

```bash
npm run test:products
# or
node scripts/test-products.js
```

### Test StopSuite Order Creation
Creates a test shop order in StopSuite to verify the integration.

```bash
npm run test:order
# or
node scripts/test-shoporder.js
```

---

## 📋 Environment Variables Required

Make sure these are set in your `.env` file:

```bash
# Shopify
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=yourstore.myshopify.com
NGROK_URL=https://xxxx.ngrok.io  # For carrier registration

# StopSuite
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...
```

---

## 🚀 Production Deployment

These scripts are **NOT** included in production deployments. Production uses the serverless functions in `/api/` folder.

Only the following are deployed to Vercel:
- `/api/shipping-rates.js` - Main carrier service endpoint
- `/api/zone-validator.js` - StopSuite zone validation
- `/api/health.js` - Health check
- `/api/routes/fetch-active.js` - StopSuite route fetching
- `/api/webhooks/` - Webhook handlers (built but not active)

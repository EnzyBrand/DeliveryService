# 🧭 Enzy Delivery Middleware
**Unified Shopify ↔ StopSuite Integration**

A custom Node.js service that provides dynamic "Carbon Negative Local Delivery" rates at Shopify checkout based on StopSuite service zone validation.

---

## 📊 Current Status

**✅ Production (Deployed & Working):**
- **Carrier Service:** `https://enzy-delivery-carrier-service.vercel.app`
- Shopify CarrierService integration (`/api/shipping-rates`)
- Google Maps geocoding (`lib/geocode.js`)
- StopSuite zone validation (`api/zone-validator.js`)
- Health check endpoint (`/health`)
- Webhook handlers (`/api/webhooks/order-created.js`, `/api/webhooks/stopsuite-complete.js`)
- Order sync functionality (`/lib/stopsuite-sync.js`)
- StopSuite route fetcher (`/api/routes/fetch-active.js`)

**⚠️ Pending Configuration:**
- Shopify webhook registration (requires Shopify admin access)
- StopSuite webhook registration (requires StopSuite admin access)

**Why v1 is Unified:** For simplicity and speed, we're keeping checkout logic and order sync in one codebase. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the future v2 separation plan.

---

## 🧩 Tech Stack

- **Node.js** (v18+) with ES Modules
- **Express.js** backend
- **Shopify CarrierService API** for checkout rates
- **StopSuite API** for zone validation & order management
- **Google Maps Geocoding API** for address lookup
- **Vercel** serverless deployment

## ✨ Key Features

### 🚚 Real-Time Delivery Rates (Deployed)
- Shopify CarrierService API integration
- Google Maps geocoding (address → lat/lng)
- StopSuite zone validation (inside/outside service area)
- Dynamic "Carbon Negative Local Delivery" rate at checkout
- Graceful fallback to Shopify default rates

### 📦 Automatic Order Sync (Built, Not Deployed)
- HMAC-SHA256 authentication with StopSuite
- Syncs customer + location + shop order to StopSuite
- Route assignment capabilities
- Designed for multi-city expansion

## 🧭 Data Flow

### At Checkout (✅ Production)
```
Shopify Checkout
  ↓
CarrierService → /api/shipping-rates
  ↓
Google Maps Geocoding → Lat/Lng
  ↓
StopSuite Zone Validation
  ↓
Return "Carbon Negative Local Delivery" rate
```

### After Purchase (⚠️ Built, Not Deployed)
```
Shopify Order Creation
  ↓
Webhook → /api/webhooks/order-created
  ↓
StopSuite: Create customer → location → shop order
  ↓
(Future) Route assignment + fulfillment updates
```

## ⚙️ API Endpoints

| Endpoint | Description | Status |
|----------|-------------|--------|
| `GET /health` | Health check for uptime monitoring | ✅ Production |
| `POST /api/shipping-rates` | Calculate delivery rates at checkout | ✅ Production |
| `GET /api/routes/fetch-active` | Fetch active StopSuite routes (diagnostic) | ✅ Production |
| `POST /api/webhooks/order-created` | Shopify → StopSuite order sync | ✅ Production |
| `POST /api/webhooks/stopsuite-complete` | StopSuite → Shopify fulfillment updates | ✅ Production |
## ⚡ Local Development Setup

### 1️⃣ Clone & Install
```bash
git clone <repository-url>
cd enzy-delivery-app
npm install
```

### 2️⃣ Environment Variables
Create a `.env` file in the root directory:
```env
# StopSuite API (Required for all features)
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx

# Google Maps API (Required for carrier service)
GOOGLE_MAPS_API_KEY=AIza...

# Shopify Admin API (Required for webhooks - future)
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=xxxxx
```

### 3️⃣ Run Local Server
```bash
node dev-carrier-server.js
# Server runs on http://localhost:3001
```

### 4️⃣ Expose via ngrok (for Shopify testing)
```bash
ngrok http 3001
```
Use the generated HTTPS URL as your Shopify CarrierService callback URL.

### 5️⃣ Register Carrier with Shopify
```bash
npm run carrier:register    # Register carrier service
npm run carrier:list        # List carriers
npm run carrier:delete <ID> # Delete carrier by ID
```

## 🧱 File Structure

| Path | Description | Status |
|------|-------------|--------|
| `api/shipping-rates.js` | Carrier service endpoint - rate calculation | ✅ Deployed |
| `api/zone-validator.js` | StopSuite zone validation logic | ✅ Deployed |
| `api/health.js` | Health check endpoint | ✅ Deployed |
| `api/routes/fetch-active.js` | StopSuite route fetcher (diagnostic) | ✅ Deployed |
| `api/webhooks/order-created.js` | Shopify → StopSuite order sync (Vercel handler) | ✅ Deployed |
| `api/webhooks/stopsuite-complete.js` | StopSuite → Shopify fulfillment (Vercel handler) | ✅ Deployed |
| `lib/geocode.js` | Google Maps geocoding utility | ✅ In use |
| `lib/stopsuite-sync.js` | StopSuite API helper functions | ✅ In use |
| `scripts/` | Development & testing utilities | 🛠️ Dev only |
| `dev-carrier-server.js` | Express app (local development) | 🛠️ Dev only |

## 🧾 Example API Response

**Shipping Rate Response:**
```json
{
  "rates": [
    {
      "service_name": "Carbon Negative Local Delivery",
      "service_code": "CARBON_NEGATIVE_LOCAL",
      "total_price": "499",
      "currency": "USD",
      "min_delivery_date": "2025-11-06",
      "max_delivery_date": "2025-11-07"
    }
  ]
}
```

## 🧰 Testing & Deployment

### Testing Commands
```bash
npm run dev              # Start local dev server
npm run test:order       # Test StopSuite order creation
npm run test:products    # Test StopSuite product fetching
```

### Production Deployment
```bash
npm run deploy           # Deploy to Vercel
# or
vercel --prod
```

### Testing in Production
```bash
# Health check
curl https://enzy-delivery-carrier-service.vercel.app/health

# Test Nashville address
curl -X POST https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"address1":"123 Broadway","city":"Nashville","province":"TN","postal_code":"37201","country":"US"}}}'
```

## 🔜 Future Roadmap (v2+)

| Feature | Purpose |
|---------|---------|
| Webhook fulfillment sync | Auto-update Shopify orders when delivered |
| Customer matching | Tailor rates for existing customers |
| Route assignment | Auto-assign orders to drivers |
| Multi-city expansion | Support Compost KC, ATL, etc. |
| Microservices split | Separate carrier service from order middleware |

## 📚 Additional Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - V2 separation plan & complete API documentation
- **[TODO.md](./TODO.md)** - Active tasks & future work
- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - AI coding guidelines

---

**Status:** All services deployed to Vercel and operational ✅
**Next Focus:** Configure Shopify and StopSuite webhook registrations
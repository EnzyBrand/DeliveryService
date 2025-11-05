# 🧭 Enzy Delivery Middleware

**Unified Shopify ↔ StopSuite Integration**

A Node.js serverless application that calculates dynamic "Carbon Negative Local Delivery" rates at Shopify checkout based on StopSuite service zone validation.

---

## 📋 Status

**✅ Production:** Carrier service deployed and registered with Shopify
**⚠️ Built, Not Deployed:** Order sync webhooks (Vercel-ready)

**Production URL:** `https://enzy-delivery-carrier-service-tristan2828s-projects.vercel.app` (stable - never changes)
**Shopify Carrier ID:** `74345676973`

---

## 🌍 What It Does

This service acts as middleware between Shopify and StopSuite to:

1. **At Checkout:** Calculate and return local compost delivery rates based on customer address
2. **After Purchase (Not Active Yet):** Automatically sync orders to StopSuite for fulfillment

---

## 🧩 Tech Stack

- **Runtime:** Node.js v18+
- **Framework:** Express.js (local dev) + Vercel Serverless Functions (production)
- **APIs:** Shopify CarrierService, StopSuite Client API, Google Maps Geocoding
- **Deployment:** Vercel

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Vercel CLI (for deployment)
- Shopify store with admin access
- StopSuite API credentials
- Google Maps API key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd enzy-delivery-app

# Install dependencies
npm install

# Create .env file (see Environment Variables section below)
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following:

```env
# StopSuite API (Required)
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx

# Google Maps API (Required for geocoding)
GOOGLE_MAPS_API_KEY=AIza...

# Shopify Admin API (Required for webhooks - future)
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=xxxxx
SHOPIFY_ADMIN_URL=https://myshop.myshopify.com/admin
SHOPIFY_ADMIN_TOKEN=shpat_xxxxx
SHOPIFY_LOCATION_ID=xxxxx
```

### Local Development

```bash
# Start development server
node dev-carrier-server.js

# Server runs on http://localhost:3001
```

### Testing

```bash
# Test carrier service rate calculation
npm run test:carrier

# Test StopSuite order creation
node scripts/test-shoporder.js

# Test StopSuite product fetching
node scripts/test-products.js
```

### Deployment

```bash
# Deploy to production
vercel --prod
```

---

## 🌐 API Endpoints

### Production Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/health` | GET | Health check for monitoring | ✅ Live |
| `/api/shipping-rates` | POST | Shopify CarrierService callback | ✅ Live |
| `/api/webhooks/order-created` | POST | Shopify order sync to StopSuite | ⚠️ Ready |
| `/api/webhooks/stopsuite-complete` | POST | StopSuite fulfillment updates | ⚠️ Ready |
| `/api/routes/fetch-active` | GET | Fetch active StopSuite routes | Built |

### Example: Shipping Rate Request

**Request:**
```bash
curl -X POST https://your-app.vercel.app/api/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{
    "rate": {
      "destination": {
        "address1": "123 Main St",
        "city": "Nashville",
        "province": "TN",
        "postal_code": "37201",
        "country": "US"
      }
    }
  }'
```

**Response (Inside Zone):**
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

**Response (Outside Zone):**
```json
{
  "rates": []
}
```
*Empty array falls back to Shopify's default shipping rates*

---

## 🧱 Project Structure

```
📦 enzy-delivery-app
├── api/                          # Vercel serverless functions
│   ├── health.js                 # Health check endpoint
│   ├── shipping-rates.js         # ✅ LIVE - Carrier service
│   ├── zone-validator.js         # Zone validation logic
│   ├── routes/
│   │   └── fetch-active.js       # StopSuite route fetcher
│   └── webhooks/
│       ├── order-created.js      # ⚠️ READY - Shopify → StopSuite
│       └── stopsuite-complete.js # ⚠️ READY - StopSuite → Shopify
├── lib/                          # Shared utilities
│   ├── geocode.js                # Google Maps geocoding
│   └── stopsuite-sync.js         # StopSuite API client
├── scripts/                      # Testing & CLI tools
│   ├── test-products.js          # Test product API
│   ├── test-shoporder.js         # Test order creation
│   ├── register-carrier.js       # Register new Shopify carrier
│   ├── update-carrier.js         # Update carrier callback URL
│   ├── list-carriers.js          # List carriers
│   └── delete-carrier.js         # Delete carrier
├── .claude/
│   └── CLAUDE.md                 # AI assistant coding guidelines
├── dev-carrier-server.js         # Local Express server
├── README.md                     # This file
├── TODO.md                       # Remaining work & roadmap
├── ARCHITECTURE.md               # Future service separation plan
└── package.json                  # Dependencies & scripts
```

---

## 🔄 Data Flow

### At Checkout (Live)
```
Customer enters shipping address
    ↓
Shopify sends address to /api/shipping-rates
    ↓
Geocode address via Google Maps API
    ↓
Check if coordinates are in StopSuite service zone
    ↓
Return "Carbon Negative Local Delivery" rate (or empty for default)
    ↓
Customer sees delivery option at checkout
```

### After Checkout (Not Active Yet)
```
Customer completes purchase
    ↓
Shopify webhook triggers /api/webhooks/order-created
    ↓
Create customer, location, and shop order in StopSuite
    ↓
(Future) Assign to driver route
    ↓
Driver completes delivery
    ↓
StopSuite webhook triggers /api/webhooks/stopsuite-complete
    ↓
Mark Shopify order as fulfilled
```

---

## 🧪 Development Scripts

```bash
# Start local server
npm start

# Test endpoints
npm run test:carrier             # Test rate calculation
node scripts/test-shoporder.js   # Test StopSuite order sync
node scripts/test-products.js    # Test product fetching

# Carrier service management
node scripts/register-carrier.js          # Register new carrier with Shopify
node scripts/update-carrier.js <id>       # Update existing carrier URL
node scripts/list-carriers.js             # List registered carriers
node scripts/delete-carrier.js <id>       # Delete carrier service

# Deploy
vercel --prod                             # Deploy to production
```

---

## 🔗 Integration Setup

### Shopify CarrierService Registration

**Prerequisites:** Add these to your `.env` file:
```env
VERCEL_PRODUCTION_URL=https://your-app.vercel.app
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=yourstore.myshopify.com
```

#### Register New Carrier Service

```bash
# First time setup
node scripts/register-carrier.js
```

#### Update Existing Carrier Service URL

```bash
# List carriers to find ID
node scripts/list-carriers.js

# Update callback URL (e.g., after redeploying to new Vercel URL)
node scripts/update-carrier.js <carrier_id>
```

**Example:**
```bash
$ node scripts/list-carriers.js
# Find your carrier ID (e.g., 74345676973)

$ node scripts/update-carrier.js 74345676973
🌐 Using callback URL: https://your-app.vercel.app/api/shipping-rates
📍 Environment: Production (Vercel)
✅ Carrier service updated successfully
```

The scripts automatically use `VERCEL_PRODUCTION_URL` if set, otherwise fall back to `NGROK_URL` for local development.

---

## 📚 Additional Documentation

- **[TODO.md](./TODO.md)** - Remaining work, next steps, and roadmap
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Future microservices separation plan
- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - Coding guidelines for AI assistants

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

---

## 📄 License

Proprietary - All rights reserved

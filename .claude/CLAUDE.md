🧭 CLAUDE.md

Guidance for AI Coding Assistants (Claude / ChatGPT / Replit Agent / Copilot)

This file provides architectural context and development rules for working on the Enzy Delivery Middleware — a unified Shopify ↔ StopSuite integration managing both checkout delivery rates and post-checkout order sync.

🌍 Project Overview

This repository implements the Enzy Delivery Middleware, a unified "Rates + Ops" service that:

✅ **Currently Deployed:** Calculates dynamic local compost delivery rates at checkout using Shopify's CarrierService API.

⚠️ **Built, Not Deployed:** Automatic StopSuite shop order creation after checkout (webhook handlers exist but aren't active yet).

It runs as a single Express app (Node.js, ES Modules) and can deploy serverlessly to Vercel, Railway, or Fly.io.

🚨 Current Deployment Status

**What's LIVE in Production:**
✅ Shopify CarrierService integration (`/api/shipping-rates`)
✅ Google Maps geocoding
✅ StopSuite zone validation
✅ Health check endpoint

**What's BUILT but NOT Deployed:**
⚠️ Shopify webhook handlers (`/api/webhooks/`)
⚠️ StopSuite order sync functionality
⚠️ Automatic order creation

**Why:** For v1, we're focusing on the CRITICAL checkout flow. Order sync will be deployed when ready (likely as a separate service - see ARCHITECTURE.md).

⚙️ Core Architecture
🧱 Components
File	Purpose	Status
/api/shipping-rates.js	Shopify checkout endpoint — calculates and returns Compost Nashville rate	✅ Deployed
/api/zone-validator.js	StopSuite zone validation logic	✅ Deployed
/api/health.js	Health check endpoint for monitoring	✅ Deployed
/api/routes/fetch-active.js	Signed StopSuite API route fetcher (ops debugging)	✅ Built
/api/webhooks/order-created.js	Shopify webhook handler (order → StopSuite)	⚠️ Built, not deployed
/api/webhooks/stopsuite-complete.js	StopSuite fulfillment → Shopify updates	⚠️ Built, not deployed
/lib/geocode.js	Google Maps address → lat/lng conversion	✅ In use
/lib/stopsuite-sync.js	StopSuite order sync utilities	⚠️ Built, not deployed
/dev-carrier-server.js	Express app entry point (local development + logging)	✅ Dev only
🧭 Unified “Rates + Ops” Model

This project originally considered splitting into two services:

Rates Service → Handles checkout logic (rate eligibility)

Ops Service → Handles fulfillment logic (order sync, routes)

For v1, these are intentionally unified under one codebase for simplicity and speed:

✅ Single .env for both Shopify + StopSuite credentials

✅ Single deploy target on Vercel

✅ One ngrok tunnel for all local testing

✅ No cross-service latency or sync issues

✅ Easier debugging and iteration during early rollout

When Enzy expands to multiple compost partners (e.g. Compost KC, Compost ATL), these will become two separate services (enzy-rates, enzy-ops).

🌐 Key Endpoints
Endpoint	Description	Status
POST /api/shipping-rates	Shopify → StopSuite compost delivery rate calculation	✅ Production
GET /api/health	Health check for monitoring	✅ Production
GET /api/routes/fetch-active	Signed StopSuite route fetch (diagnostic)	✅ Built
POST /api/webhooks/order-created	Shopify order → StopSuite order sync	⚠️ Built, not deployed
POST /api/webhooks/stopsuite-complete	StopSuite → Shopify fulfillment updates	⚠️ Built, not deployed
🔁 Data Flow Summary
At Checkout
Shopify Checkout
  ↓
CarrierService → /api/shipping-rates
  ↓
Google Maps → Geocode address
  ↓
StopSuite → Validate Compost Nashville service area
  ↓
Return dynamic local delivery rate

After Checkout (Not Yet Deployed)
Shopify Order Creation
  ↓
Webhook trigger → /api/webhooks/order-created
  ↓
StopSuite → Create customer, location, and shop order
  ↓
(Future) Route assignment + fulfillment update

🧩 Development Commands
🔧 Local Development
npm install
node dev-carrier-server.js

🧪 Testing
npm run test:carrier      # Test checkout rate endpoint
node test-shoporder.js    # Create mock StopSuite order

🌐 Expose Local Server
ngrok http 3001


Use the generated HTTPS URL as your Shopify callback_url when registering the CarrierService.

🧠 StopSuite Integration
Endpoints Used

POST /api/client/check-service-area/

POST /api/client/customers/create/

POST /api/client/customer-locations/create/

POST /api/client/shop-orders/create/

GET /api/client/routes/ (for testing + ops)

Auth Headers
X-API-Key
X-Signature
X-Timestamp
X-Nonce

Example Payload
{
  "products": [{ "product_id": 34, "quantity": 1 }],
  "customer_location_id": 2000,
  "delivery_notes": "Test order from Enzy → StopSuite integration"
}

Example Shopify Checkout Rate Response
{
  "rates": [
    {
      "service_name": "Carbon Negative Delivery by Compost Nashville",
      "service_code": "NASH_COMPOST_DELIVERY",
      "total_price": "499",
      "currency": "USD"
    }
  ]
}

🧱 File Structure
📦 EnzyDelivery
│
├── api/                           # Vercel serverless functions
│   ├── shipping-rates.js          # ✅ DEPLOYED - Carrier service endpoint
│   ├── zone-validator.js          # ✅ DEPLOYED - Zone validation
│   ├── health.js                  # ✅ DEPLOYED - Health check
│   ├── routes/
│   │   └── fetch-active.js        # StopSuite route fetcher
│   └── webhooks/
│       ├── order-created.js       # ⚠️ NOT DEPLOYED - Shopify → StopSuite sync
│       └── stopsuite-complete.js  # ⚠️ NOT DEPLOYED - Fulfillment updates
│
├── lib/                           # Shared utilities
│   ├── geocode.js                 # ✅ Google Maps geocoding
│   └── stopsuite-sync.js          # ⚠️ StopSuite API helpers (not deployed)
│
├── web/                           # Development server files
│   └── api/
│       └── shipping-rates.js      # Local dev mirror of /api/shipping-rates.js
│
├── .claude/
│   └── CLAUDE.md                  # This file - AI assistant guidance
│
├── dev-carrier-server.js          # Express dev server
├── test-shoporder.js              # Test order sync
├── package.json
├── README.md
├── ARCHITECTURE.md                # Future separation plan
└── TODO.md                        # Task tracking

🧩 Environment Variables
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com

🧠 Development Guidance for AI Assistants

When modifying or extending code:

🧱 Style & Syntax

Use ES Modules (import/export) — no CommonJS.

Always use async/await — no raw .then() chains.

Use node-fetch (ESM version) for all API calls.

Maintain emoji-based logging:

🧾 Payload out

🌐 Request route

✅ Success

⚠️ Warning / fallback

❌ Error

🔒 Security

Never hardcode secrets or ZIPs.

Always pull keys from process.env.

Always use StopSuite’s HMAC signing method for requests.

Strip sensitive logs before commit.

🧩 Organization

Add new StopSuite logic under /lib/ (e.g. stopsuite-sync.js).

Add new webhook handlers under /api/webhooks/*.

For new integrations (Compost KC, ATL, etc.), create a new zone validator under /api/zones/.

Keep everything modular for an eventual split into enzy-rates and enzy-ops.

🔄 Future Roadmap (v2+)
Feature	Goal
Webhook → Fulfillment Sync	Auto-update Shopify order status from StopSuite
Customer Matching	Show different shipping messages/rates for existing Compost Nashville customers
Dynamic Route Assignment	Auto-assign orders to drivers in StopSuite
Rates + Ops Separation	Split into two microservices for scalability
Multi-City Rollout	Extend Compost integration to additional cities
✅ Current Status

Functional:

✅ Shopify CarrierService rate calculation

✅ Google Maps → StopSuite validation

✅ StopSuite shop-order creation

✅ HMAC authentication

✅ Unified Express server with logging

✅ Local + Vercel parity

Next Up:

🔄 Delivery webhooks → Shopify fulfillment updates

⚡ Smarter error retry handling

🌎 Multi-city compost expansion

🧭 Summary

The Enzy Delivery Middleware is the operational backbone connecting Shopify checkout and StopSuite logistics.
It authenticates via HMAC, validates compost service areas in real time, creates StopSuite orders automatically, and unifies all this under one Express app for simplicity and reliability.

v1 = unified, stable foundation
v2 = webhooks, routing, and scalability

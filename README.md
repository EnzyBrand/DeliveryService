# 🧭 Enzy Delivery Middleware
**Unified Shopify ↔ StopSuite Integration**

A custom Node.js service that provides dynamic "Carbon Negative Local Delivery" rates at Shopify checkout based on StopSuite service zone validation.

**Production Status:** Carrier service deployed and functional ✅
**Future:** Automatic order sync (built but not deployed yet) ⚠️

🧩 Tech Stack

Node.js (v18+) — https://nodejs.org

Express.js Backend — https://expressjs.com

Shopify CarrierService API — Shopify Dev Docs

🌍 Overview

Enzy Delivery acts as the middleware layer between Shopify Checkout and StopSuite.
It powers:

🧮 Dynamic rate calculation (during checkout)

🧾 Order + customer sync (after purchase)

Initially built as a Nashville-only ZIP matcher, it’s now a full HMAC-authenticated StopSuite integration using live zone validation, customer creation, and shop-order sync.

✨ Key Features
🚚 Real-Time Compost Delivery Rates (Rates Layer)

Fully compliant with Shopify’s CarrierService API

Uses Google Maps Geocoding → latitude/longitude

Calls StopSuite API to validate compost zone eligibility

Returns dynamic “Compost Nashville Delivery” rate in checkout

📦 Automatic Shop Order Creation (Ops Layer)

HMAC authentication using StopSuite’s signature protocol

Syncs customer + address + order into StopSuite

Designed for scalable multi-zone expansion (future Compost KC, Compost ATL, etc.)

Includes signed route fetching endpoint for operational debugging

🔒 Reliability

Graceful error recovery for StopSuite sandbox timeouts

Detailed logging for each request

Safe fallback to standard shipping if Compost route unavailable

🧱 Why It’s Unified (for Now)

While some architectures split “checkout logic” and “post-purchase logic” into separate apps, Enzy Delivery stays unified in V1 to:

✅ Simplify deployment — one .env, one Vercel project
✅ Keep Shopify and StopSuite credentials in one secure environment
✅ Allow local development + testing via a single ngrok tunnel
✅ Eliminate cross-service dependencies before scale

Once multi-city expansion begins or load increases, this codebase can be cleanly split into:

enzy-rates → Handles checkout logic

enzy-ops → Handles fulfillment + route management

🧭 Data Flow Overview
At Checkout
Shopify Checkout
  ↓
CarrierService → EnzyDelivery (/api/shipping-rates)
  ↓
Google Maps Geocode → Latitude / Longitude
  ↓
StopSuite API Validation (/api/check-service-area)
  ↓
Returns Compost Nashville delivery rate (or fallback)

After Purchase
Shopify Order Creation
  ↓
Webhook → EnzyDelivery (/api/create-order)
  ↓
Creates StopSuite customer → location → shop order
  ↓
Optional: route assignment (future)

⚙️ Key Endpoints
Endpoint	Description	Status
GET /health	Health check for uptime monitoring	✅ Production
POST /api/shipping-rates	Calculates live compost delivery eligibility	✅ Production
GET /api/routes/fetch-active	Lists all active routes in StopSuite	Built
POST /api/webhooks/order-created	Creates StopSuite shop order after checkout	⚠️ Built, not deployed
POST /api/webhooks/stopsuite-complete	StopSuite → Shopify fulfillment updates	⚠️ Built, not deployed
⚡ Local Development Setup

1️⃣ Clone & Install

git clone <repository-url>
cd EnzyDelivery
npm install


2️⃣ Environment Variables (.env)

STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com


3️⃣ Run Server

node dev-carrier-server.js
# or
npm run start:dev


4️⃣ Expose via ngrok

ngrok http 3001


Then register your ngrok URL with Shopify’s CarrierService API callback.

🧱 File Overview
File	Description	Status
api/shipping-rates.js	Returns compost delivery rates at checkout	✅ Deployed
api/zone-validator.js	StopSuite zone validation	✅ Deployed
api/health.js	Health check endpoint	✅ Deployed
api/routes/fetch-active.js	Signed StopSuite route fetch	Built
api/webhooks/order-created.js	Shopify → StopSuite order sync	⚠️ Built, not deployed
api/webhooks/stopsuite-complete.js	StopSuite → Shopify fulfillment updates	⚠️ Built, not deployed
lib/geocode.js	Converts address → coordinates	✅ In use
lib/stopsuite-sync.js	StopSuite API utilities	Built
dev-carrier-server.js	Express entry point (local dev)	Dev only
🧠 Technical Summary

**Current Flow (Deployed):**
1. Shopify sends checkout data → `/api/shipping-rates`
2. EnzyDelivery geocodes address → validates StopSuite zone
3. Returns compost delivery rate (or empty array for fallback)
4. Shopify displays delivery options to customer

**Future Flow (Not Deployed Yet):**
5. Shopify creates order → webhook triggers `/api/webhooks/order-created`
6. StopSuite receives customer + location + order creation
7. StopSuite completion → webhook triggers `/api/webhooks/stopsuite-complete`
8. Shopify order marked as fulfilled

🧾 Example: Shipping Rate Response
{
  "rates": [
    {
      "service_name": "Carbon Negative Delivery by Compost Nashville",
      "service_code": "NASH_COMPOST_DELIVERY",
      "total_price": "499",
      "description": "Delivered locally by Compost Nashville – carbon negative and zero plastic.",
      "currency": "USD",
      "min_delivery_date": "2025-10-15",
      "max_delivery_date": "2025-10-17"
    }
  ]
}

🔜 Coming Next (v2 Roadmap)
Feature	Purpose
StopSuite ↔ Shopify fulfillment sync	Mark orders as delivered
Customer matching (Compost Nashville users)	Tailor shipping messages + rates
Route assignment automation	Assign StopSuite driver automatically
Separate Rates + Ops services	For multi-city scalability
Order status updates	“Order Received → Preparing → Out for Delivery”
🧰 Dev Commands
npm start                # Run Express server
npm run test:carrier     # Test rate logic
node test-shoporder.js   # Simulate StopSuite order creation
vercel --prod            # Deploy to Vercel

🏗️ Architecture Summary

**✅ Currently Deployed:**
```
Shopify Checkout
 ↓
CarrierService → /api/shipping-rates
 ↓
Google Maps Geocoding + StopSuite Zone Check
 ↓
Returns "Carbon Negative Delivery" rate
```

**⚠️ Built But Not Deployed:**
```
Shopify Order Created
 ↓
Webhook → /api/webhooks/order-created
 ↓
StopSuite: Create customer + location + shop order
 ↓
(Future) Assign to driver route
```

For more details on the unified v1 architecture and future v2 separation plan, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
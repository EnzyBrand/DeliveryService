# Architecture & Future Project Separation Plan

## 🏗️ **Current State: Monolithic Architecture**

Currently, this project contains **TWO distinct services** in one codebase:

1. **Carrier Service** - Lightweight, high-frequency rate calculator (CRITICAL for checkout)
2. **Order Middleware** - Complex, low-frequency order sync system (NICE-TO-HAVE for automation)

---

## 🎯 **Why Separate Into Two Projects?**

### **Performance Requirements**
- **Carrier Service**: Must respond in <2 seconds (Shopify timeout constraint)
- **Order Middleware**: Can take 5-10+ seconds (async background processing)

### **Scaling Needs**
- **Carrier Service**: High frequency reads (every checkout = API call)
- **Order Middleware**: Low frequency writes (only when orders are placed)

### **Reliability Isolation**
- **Carrier Service**: CRITICAL - if it fails, customers can't checkout
- **Order Middleware**: OPTIONAL - if it fails, manual order entry still works
- Webhook failures shouldn't crash or slow down the critical carrier service

### **Deployment Constraints**
- **Vercel Serverless Functions**: 10-second timeout limit
- **Carrier Service**: Fast enough to stay under timeout easily
- **Order Middleware**: Multi-step sync might exceed timeout (needs container deployment)

### **Development & Debugging**
- Clearer separation of concerns
- Easier to debug issues (carrier vs order sync problems are separate)
- Independent versioning and deployment cycles
- Different teams can own different services

---

## 📦 **Planned Project Split**

### **Project 1: `enzy-delivery-carrier-service` (Keep Current - CRITICAL)**

#### **Purpose:**
Shopify Carrier Service - provides dynamic delivery rates at checkout based on customer address and StopSuite service zones.

**This is the CORE feature** - without this, customers can't see delivery options.

#### **Endpoints:**
```
POST /api/shipping-rates  (Shopify calls during checkout)
GET  /health              (Health check / uptime monitoring)
```

#### **Files to Keep:**
```
/api/
  ├── shipping-rates.js    ← Main carrier service endpoint
  ├── zone-validator.js    ← StopSuite zone validation
  └── health.js            ← Health check

/lib/
  └── geocode.js           ← Google Maps geocoding

/ (root)
  └── test-carrier-service.js  ← Component tests
```

#### **Dependencies:**
- Google Maps Geocoding API (address → lat/lng conversion)
- StopSuite `/api/check-service-area/` endpoint (zone validation)

#### **Deployment:**
- **Platform**: Vercel (serverless functions)
- **Performance Target**: <2 seconds response time
- **Scaling**: Auto-scales with Shopify checkout traffic

#### **Environment Variables:**
```env
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...
```

---

### **Project 2: `enzy-shopify-stopsuite-middleware` (Create Later - OPTIONAL AUTOMATION)**

#### **Purpose:**
Bidirectional Shopify ↔ StopSuite order sync - automates order entry and fulfillment updates.

**This is a NICE-TO-HAVE feature** - it automates manual processes but isn't required for the business to function.

#### **Endpoints:**
```
POST /webhooks/order-created         (Shopify → StopSuite)
     → Automatically creates orders in StopSuite when customer checks out
     → Syncs: Customer → Location → Shop Order → Route assignment

POST /webhooks/stopsuite-complete    (StopSuite → Shopify)
     → Automatically marks Shopify orders as fulfilled when driver completes delivery
     → Updates Shopify order status → Triggers customer email notification
```

#### **CLI Tools:**
```
register-carrier.js   ← Register carrier service with Shopify (one-time setup)
list-carriers.js      ← List all registered carrier services
delete-carrier.js     ← Remove carrier services
```

#### **Files to Move:**
```
/api/webhooks/
  ├── order-created.js         ← Shopify webhook handler
  └── stopsuite-complete.js    ← StopSuite webhook handler

/lib/
  └── stopsuite-sync.js        ← Order sync logic (customer, location, shop order)

/ (root)
  ├── register-carrier.js      ← CLI: Register carrier
  ├── list-carriers.js         ← CLI: List carriers
  ├── delete-carrier.js        ← CLI: Delete carrier
  ├── test-products.js         ← Product testing
  └── test-shoporder.js        ← Order sync testing
```

#### **Dependencies:**
- Shopify Admin API (read/write orders, manage fulfillments)
- StopSuite Client API (customers, locations, shop orders, routes)
- Possibly a database for tracking sync status and retries (PostgreSQL/MongoDB)

#### **Deployment:**
- **Platform**: Vercel/Railway/Render (serverless or container)
- **Performance**: Can be slower (5-10+ seconds) - async background work
- **Scaling**: Lower traffic volume than carrier service

#### **Environment Variables:**
```env
# StopSuite API
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx

# Shopify API
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=xxxxx

# Optional: Database for sync tracking
DATABASE_URL=postgresql://...
```

---

## 📋 **Migration Checklist (When Ready to Split)**

### **Phase 1: Preparation**
- [ ] Create new repository: `enzy-shopify-stopsuite-middleware`
- [ ] Set up new Vercel/Railway project for middleware
- [ ] Copy shared dependencies (package.json, .env.example)
- [ ] Update both README.md files with clear purpose statements

### **Phase 2: File Migration**
- [ ] **Move to middleware project:**
  - `lib/stopsuite-sync.js`
  - `api/webhooks/order-created.js`
  - `api/webhooks/stopsuite-complete.js`
  - `register-carrier.js`
  - `list-carriers.js`
  - `delete-carrier.js`
  - `test-products.js`
  - `test-shoporder.js`

- [ ] **Keep in carrier service project:**
  - `api/shipping-rates.js`
  - `api/zone-validator.js`
  - `api/health.js`
  - `lib/geocode.js`
  - `test-carrier-service.js`

- [ ] **Delete from carrier service project:**
  - `api/webhooks/` directory
  - `lib/stopsuite-sync.js`
  - Carrier management CLI tools
  - Middleware test files

### **Phase 3: Code Updates**
- [ ] Update import paths in middleware project
- [ ] Remove webhook routes from `dev-carrier-server.js`
- [ ] Create new `dev-middleware-server.js` in middleware project
- [ ] Update package.json scripts in both projects
- [ ] Simplify carrier service to only handle rate calculations

### **Phase 4: Documentation**
- [ ] Update CLAUDE.md in carrier service (remove middleware references)
- [ ] Create new CLAUDE.md in middleware project
- [ ] Update README.md in both projects
- [ ] Update TODO.md in both projects
- [ ] Create ARCHITECTURE.md in middleware project (if needed)

### **Phase 5: Deployment**
- [ ] Deploy carrier service independently
- [ ] Test carrier service endpoints in production
- [ ] Deploy middleware service independently
- [ ] Test webhook endpoints in staging
- [ ] Update environment variables in both Vercel projects

### **Phase 6: Integration**
- [ ] Register Shopify webhook pointing to middleware URL
- [ ] Register StopSuite webhook (if supported)
- [ ] Test end-to-end order sync flow
- [ ] Monitor logs for errors
- [ ] Set up error alerting for both services

---

## 🔄 **Data Flow After Separation**

### **Checkout Flow (Carrier Service)**
```
Customer adds items to cart
    ↓
Proceeds to checkout
    ↓
Shopify → POST https://carrier-service.vercel.app/api/shipping-rates
    ↓
Carrier Service:
  - Geocodes address via Google Maps
  - Validates zone via StopSuite API
  - Returns delivery rate
    ↓
Shopify displays "Carbon Negative Local Delivery" option
    ↓
Customer completes purchase
```

### **Order Sync Flow (Middleware)**
```
Customer completes purchase
    ↓
Shopify → POST https://middleware.vercel.app/webhooks/order-created
    ↓
Middleware:
  - Verifies webhook signature
  - Creates customer in StopSuite
  - Creates customer location in StopSuite
  - Creates shop order in StopSuite
  - Assigns to driver route (optional)
    ↓
Driver sees delivery in StopSuite app
    ↓
Driver completes delivery
    ↓
StopSuite → POST https://middleware.vercel.app/webhooks/stopsuite-complete
    ↓
Middleware:
  - Verifies webhook signature
  - Marks Shopify order as fulfilled
    ↓
Customer receives delivery confirmation email from Shopify
```

---

## ⚡ **Benefits After Separation**

### **For Carrier Service:**
✅ Ultra-simple codebase - easier to maintain
✅ Guaranteed fast performance - no heavy sync logic
✅ Independent scaling - scales with checkout traffic
✅ Reduced risk - fewer dependencies = fewer failure points
✅ Easier debugging - logs only contain rate calculation

### **For Middleware:**
✅ Can use longer timeouts or containers if needed
✅ Can add database for retry logic and sync tracking
✅ Can add queue system (Redis/BullMQ) for reliability
✅ Independent deployment - won't affect critical carrier service
✅ Can iterate faster without risking checkout functionality

### **For Development:**
✅ Clear separation of concerns
✅ Different teams can own different repos
✅ Easier onboarding (simpler codebases)
✅ Independent versioning (v1.0 carrier, v2.0 middleware)
✅ Can use different tech stacks if needed

---

## 🚨 **Important Notes**

### **When to Split:**
- ✅ **Now**: If you have time and want clean architecture from the start
- ✅ **Soon**: When StopSuite fixes their order creation API
- ✅ **Later**: When manual order entry becomes too time-consuming
- ⚠️ **Required**: If Vercel serverless timeouts become an issue

### **What to Keep Together (For Now):**
We're keeping them together during initial development because:
- Easier to iterate on both systems simultaneously
- Shared environment variables and configuration
- Simpler deployment process while testing
- Can validate the full flow end-to-end locally

### **When to Definitely Separate:**
You **must** separate when:
- Order sync starts timing out (>10 seconds)
- Webhook failures are affecting carrier service performance
- You need to scale carrier service independently
- Different teams need to own different parts
- You want to add a database or queue system to middleware

---

## 📚 **References**

- [Microservices vs Monolith](https://martinfowler.com/articles/microservices.html)
- [Vercel Serverless Function Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Shopify Carrier Service API](https://shopify.dev/docs/api/admin-rest/latest/resources/carrierservice)
- [Shopify Webhooks](https://shopify.dev/docs/apps/webhooks)

---

*This architecture plan is designed to maximize reliability and performance while maintaining development velocity.*

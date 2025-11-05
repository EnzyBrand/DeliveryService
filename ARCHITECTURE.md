# Architecture - Future Service Separation Plan

**Planning Document for v2 Microservices Architecture**

> ⚠️ **IMPORTANT:** This document describes a **FUTURE** architecture plan, NOT current problems.
>
> **Current State (v1):** Unified monolith architecture is INTENTIONAL and CORRECT for MVP.
>
> **When to Implement:** When experiencing performance issues, scaling needs, or multi-city expansion.

For current project info, see [README.md](./README.md)
For immediate work, see [TODO.md](./TODO.md)

---

## 🎯 Purpose of This Document

This document exists to:
1. **Document the rationale** for eventually splitting into microservices
2. **Provide a roadmap** for when and how to separate services
3. **Prevent premature optimization** by clearly stating when NOT to split
4. **Guide future developers** when the time comes to scale

---

## 🏗️ Current v1 Architecture (Unified - Correct for Now)

### Why Unified is the Right Choice Now

The current unified architecture combines both "Rates" (checkout logic) and "Ops" (order sync) in one codebase. This is **intentionally correct** for v1 because:

✅ **Faster to market** - Single deployment, single codebase
✅ **Easier to debug** - All logs in one place, single Vercel project
✅ **Simpler operations** - One `.env`, one ngrok tunnel, one monitoring dashboard
✅ **Lower overhead** - No inter-service communication, no version sync issues
✅ **Carrier service is fast enough** - Well under 2-second Shopify timeout
✅ **Order sync not critical yet** - Manual entry works fine while testing
✅ **Low traffic volume** - No performance or scaling issues

### Current Structure
```
enzy-delivery-app (v1 - Unified)
├── api/
│   ├── shipping-rates.js         # Rates: Checkout logic
│   ├── zone-validator.js          # Rates: Zone validation
│   ├── webhooks/
│   │   ├── order-created.js       # Ops: Order sync
│   │   └── stopsuite-complete.js  # Ops: Fulfillment
│   └── routes/
│       └── fetch-active.js        # Ops: Route management
└── lib/
    ├── geocode.js                 # Rates: Geocoding
    └── stopsuite-sync.js          # Ops: StopSuite API client
```

---

## 🚨 When to Split (Trigger Conditions)

### DO NOT split until you experience one or more of these:

1. **Performance Issues**
   - Carrier service response time > 1.5 seconds consistently
   - Webhook processing blocking carrier service
   - Vercel serverless timeout issues (>10 seconds)

2. **Scaling Needs**
   - Order volume > 1000/day
   - Webhook processing queue backing up
   - Need independent scaling for different components

3. **Multi-City Expansion**
   - Supporting 3+ cities/partners
   - Different rate logic per region
   - Geographic distribution requirements

4. **Team Growth**
   - Multiple teams working on different components
   - Deployment conflicts between features
   - Need for independent release cycles

5. **Reliability Requirements**
   - Webhook failures affecting carrier service
   - Need circuit breakers between components
   - SLA requirements for different endpoints

---

## 📦 Proposed v2 Architecture (Two Services)

When the time comes, split into:

### Service 1: `enzy-delivery-carrier-service`
**Purpose:** Shopify Carrier Service - Calculate delivery rates at checkout

**Critical Path:** YES - Customer-facing, must be fast and reliable

**Performance Target:** < 1 second response time

**Scaling:** High frequency, scales with checkout traffic

**Components:**
```
enzy-delivery-carrier-service/
├── api/
│   ├── shipping-rates.js     # Main endpoint
│   ├── zone-validator.js      # Zone validation
│   └── health.js              # Health check
└── lib/
    └── geocode.js             # Google Maps geocoding
```

**Dependencies:**
- Google Maps Geocoding API
- StopSuite Zone Validation API (`/check-service-area/`)

**Environment Variables:**
```env
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...
```

**Deployment:**
- Platform: Vercel Serverless Functions
- Auto-scaling: Yes
- Monitoring: Critical (affects revenue)

---

### Service 2: `enzy-shopify-stopsuite-middleware`
**Purpose:** Bidirectional order sync between Shopify and StopSuite

**Critical Path:** NO - Background processing, can retry/queue

**Performance Target:** < 10 seconds (async acceptable)

**Scaling:** Low frequency, scales with order volume

**Components:**
```
enzy-shopify-stopsuite-middleware/
├── api/
│   ├── webhooks/
│   │   ├── order-created.js       # Shopify → StopSuite
│   │   └── stopsuite-complete.js  # StopSuite → Shopify
│   └── routes/
│       └── fetch-active.js        # Route management
├── lib/
│   └── stopsuite-sync.js          # StopSuite Client API
└── scripts/
    ├── register-carrier.js        # Utility scripts
    ├── list-carriers.js
    ├── delete-carrier.js
    ├── test-products.js
    └── test-shoporder.js
```

**Dependencies:**
- Shopify Admin API (orders, fulfillments)
- StopSuite Client API (customers, locations, orders, routes)
- Optional: Database for sync tracking & retries
- Optional: Redis/BullMQ for job queue

**Environment Variables:**
```env
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=xxxxx
SHOPIFY_ADMIN_URL=https://myshop.myshopify.com/admin
SHOPIFY_ADMIN_TOKEN=shpat_xxxxx
SHOPIFY_LOCATION_ID=xxxxx
DATABASE_URL=postgresql://...  # Optional
REDIS_URL=redis://...           # Optional
```

**Deployment:**
- Platform: Vercel/Railway/Render (container preferred)
- Auto-scaling: Optional
- Monitoring: Important (affects operations)

---

## 🔄 Data Flow After Separation

### Checkout Flow (Carrier Service)
```
Customer enters address at checkout
    ↓
Shopify → POST carrier-service.vercel.app/api/shipping-rates
    ↓
Carrier Service:
  - Geocode address (Google Maps)
  - Validate zone (StopSuite API)
  - Return rate or empty array
    ↓
Shopify displays delivery options
    ↓
Customer completes purchase
```

### Order Sync Flow (Middleware)
```
Customer completes purchase
    ↓
Shopify → POST middleware.vercel.app/webhooks/order-created
    ↓
Middleware:
  - Verify HMAC signature
  - Enqueue job (if using queue)
  - Create customer in StopSuite
  - Create location in StopSuite
  - Create shop order in StopSuite
  - Assign to route (optional)
    ↓
Driver sees order in StopSuite app
    ↓
Driver completes delivery
    ↓
StopSuite → POST middleware.vercel.app/webhooks/stopsuite-complete
    ↓
Middleware:
  - Verify HMAC signature
  - Mark Shopify order as fulfilled
    ↓
Customer receives fulfillment email
```

**Key Difference:** Services communicate ONLY through webhooks and API calls, not direct function imports.

---

## 📋 Migration Checklist

### Phase 1: Preparation
- [ ] Create new repository: `enzy-shopify-stopsuite-middleware`
- [ ] Set up new deployment target (Vercel/Railway/Render)
- [ ] Copy shared dependencies (`package.json`, `.env.example`)
- [ ] Set up separate monitoring/logging for each service

### Phase 2: Code Migration
- [ ] **Move to middleware:**
  - `api/webhooks/order-created.js`
  - `api/webhooks/stopsuite-complete.js`
  - `api/routes/fetch-active.js`
  - `lib/stopsuite-sync.js`
  - `/scripts/*` folder

- [ ] **Keep in carrier service:**
  - `api/shipping-rates.js`
  - `api/zone-validator.js`
  - `api/health.js`
  - `lib/geocode.js`

- [ ] **Delete from carrier service:**
  - `api/webhooks/` directory
  - `api/routes/` directory
  - `lib/stopsuite-sync.js`
  - `/scripts/*` (moved to middleware)

### Phase 3: Code Updates
- [ ] Update import paths in middleware project
- [ ] Remove webhook routes from `dev-carrier-server.js`
- [ ] Create new `dev-middleware-server.js`
- [ ] Update `package.json` scripts in both projects
- [ ] Simplify carrier service dependencies

### Phase 4: Documentation
- [ ] Update `README.md` in carrier service (remove middleware references)
- [ ] Create new `README.md` in middleware project
- [ ] Update `.claude/CLAUDE.md` in both projects
- [ ] Update `TODO.md` in both projects
- [ ] Archive/update this `ARCHITECTURE.md`

### Phase 5: Deployment
- [ ] Deploy carrier service independently
- [ ] Test carrier service in production (Shopify integration)
- [ ] Deploy middleware service independently
- [ ] Test webhooks in staging environment
- [ ] Update Shopify webhook URLs to middleware service
- [ ] Monitor both services for 24 hours

### Phase 6: Verification
- [ ] End-to-end test: Checkout → Order Sync → Fulfillment
- [ ] Verify carrier service performance (< 1s response time)
- [ ] Verify webhook processing (< 30s order sync)
- [ ] Monitor error rates and logs
- [ ] Set up alerting for both services

---

## ⚡ Benefits After Separation

### For Carrier Service:
✅ Ultra-simple codebase - easier to maintain
✅ Guaranteed fast performance - no heavy sync logic
✅ Independent scaling - scales with checkout traffic only
✅ Reduced risk - fewer dependencies = fewer failure points
✅ Easier debugging - logs only contain rate calculations
✅ Smaller bundle size - faster cold starts

### For Middleware:
✅ Can use longer timeouts (10+ seconds)
✅ Can add database for retry logic and sync tracking
✅ Can implement job queue (Redis/BullMQ) for reliability
✅ Independent deployment - won't affect critical carrier service
✅ Can iterate faster without risking checkout functionality
✅ Can add complex business logic without affecting performance

### For Development:
✅ Clear separation of concerns
✅ Different teams can own different repos
✅ Easier onboarding - simpler, focused codebases
✅ Independent versioning (v1.0 carrier, v2.0 middleware)
✅ Can use different tech stacks if needed
✅ Reduced merge conflicts

---

## 🚧 Potential Challenges

### Communication Overhead
**Challenge:** Services must communicate via webhooks/APIs instead of direct function calls
**Mitigation:** Use well-defined contracts, version APIs carefully, implement retries

### Operational Complexity
**Challenge:** Two services = two deployments, two monitoring dashboards, two `.env` files
**Mitigation:** Use infrastructure-as-code (Terraform), centralized logging (Datadog/Sentry)

### Debugging Distributed Systems
**Challenge:** Tracing requests across services is harder
**Mitigation:** Implement correlation IDs, distributed tracing (Jaeger/Zipkin)

### Deployment Coordination
**Challenge:** Changes that span both services require coordinated releases
**Mitigation:** Maintain backward compatibility, use feature flags

### Cost Increase
**Challenge:** Two Vercel projects, potential database costs, monitoring costs
**Mitigation:** Only split when revenue justifies increased operational costs

---

## 🎯 Decision Framework

Use this decision tree when considering separation:

```
Are you experiencing performance issues?
├─ YES → Is carrier service affected by webhook processing?
│  ├─ YES → Split immediately
│  └─ NO → Optimize unified service first
└─ NO → Are you expanding to 3+ cities?
   ├─ YES → Split for organizational clarity
   └─ NO → Stay unified, revisit in 6 months
```

**Rule of Thumb:** If you're unsure whether to split, DON'T. The unified architecture is simpler and sufficient until you have concrete scaling problems.

---

## 📚 References

- [Microservices Pattern](https://microservices.io/)
- [Martin Fowler: Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Vercel Serverless Functions Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Shopify Carrier Service API](https://shopify.dev/docs/api/admin-rest/latest/resources/carrierservice)
- [Shopify Webhooks Best Practices](https://shopify.dev/docs/apps/webhooks/best-practices)

---

## 🔗 Related Documentation

- **[README.md](./README.md)** - Current project setup and usage
- **[TODO.md](./TODO.md)** - Immediate work and priorities
- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - Coding guidelines

---

**Remember:** This is a planning document. The unified v1 architecture is the correct choice for now. Only implement this separation when you hit real scaling problems or multi-city expansion.

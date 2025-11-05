# TODO - Enzy Delivery Carrier Service

**Current Branch:** `docs/update-readme-claude`
**Status:** ✅ Production Ready - Carrier service tested and working in Shopify
**Last Updated:** November 4, 2025

---

## ✅ Current Status

### **Production & Working:**
- ✅ Carrier Service deployed at `https://enzy-delivery-carrier-service.vercel.app`
- ✅ Google Maps Geocoding API integration
- ✅ StopSuite zone validation API integration
- ✅ HMAC-SHA256 authentication
- ✅ Health check endpoint
- ✅ Local development environment
- ✅ Component tests passing

### **Built But Not Deployed:**
- ⚠️ Webhook handlers (will move to middleware project - see [ARCHITECTURE.md](./ARCHITECTURE.md))
- ⚠️ Order sync functionality (will move to middleware project - see [ARCHITECTURE.md](./ARCHITECTURE.md))
- ⚠️ CLI carrier management tools (will move to middleware project - see [ARCHITECTURE.md](./ARCHITECTURE.md))

### **Known Issues:**
- ⚠️ StopSuite order creation API returns 502 (their API issue, not ours)

---

## 📋 TODO: Immediate Tasks

### **High Priority - Carrier Service**


### **Medium Priority - Documentation**


### **Low Priority - Future Enhancements**
- [ ] **Add proper unit tests with Jest/Vitest**
  - [ ] Install test framework (Jest or Vitest)
  - [ ] Create `__tests__/` directory structure
  - [ ] Write unit tests for `lib/geocode.js`
  - [ ] Write unit tests for `api/zone-validator.js`
  - [ ] Write unit tests for `api/shipping-rates.js`
  - [ ] Set up test coverage reporting
  - [ ] Add `npm test` script to run tests
  - [ ] Uncomment test step in `.github/workflows/ci.yml` (currently commented out)
- [ ] Add caching for geocoding results
- [ ] Add retry logic for StopSuite API calls
- [ ] Improve error logging/monitoring
- [ ] Add performance metrics

---

## 🔮 Future Work (Deferred)

### **Separate Middleware Project** (See [ARCHITECTURE.md](./ARCHITECTURE.md))
- [ ] Create new repo: `enzy-shopify-stopsuite-middleware`
- [ ] Move webhook handlers to new repo
- [ ] Move order sync logic to new repo
- [ ] Move CLI tools to new repo (register-carrier.js, list-carriers.js, delete-carrier.js)
- [ ] Move middleware test scripts (test-products.js, test-shoporder.js)
- [ ] Deploy middleware independently
- [ ] Keep carrier service lean and fast

### **Webhook Integration** (After Separation)
- [ ] Wait for StopSuite to fix order creation API
- [ ] Register Shopify webhook for `orders/create`
- [ ] Deploy webhook handlers
- [ ] Test end-to-end order sync:
  - Shopify order → StopSuite order creation
  - StopSuite completion → Shopify fulfillment

### **Order Automation** (Nice-to-Have)
- [ ] Automatic order entry in StopSuite
- [ ] Automatic fulfillment updates in Shopify
- [ ] Retry logic for failed syncs
- [ ] Database for sync status tracking

---

## 📝 Notes

### **Environment Variables Needed:**
```env
# Required for Carrier Service
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...

# Required for Webhooks (future middleware)
SHOPIFY_ADMIN_API_KEY=shpat_xxxxx
SHOPIFY_STORE_URL=myshop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=xxxxx
```

### **Testing Commands:**
```bash
# Health check
curl https://enzy-delivery-carrier-service.vercel.app/health

# Test Nashville address
curl -X POST https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"address1":"123 Broadway","city":"Nashville","province":"TN","postal_code":"37201","country":"US"}}}'

# Test non-Nashville address
curl -X POST https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"address1":"123 Main St","city":"Los Angeles","province":"CA","postal_code":"90210","country":"US"}}}'
```

### **Shopify Carrier Registration:**
```bash
# Using CLI tool
node register-carrier.js

# Or manually with curl
curl -X POST "https://YOUR_STORE.myshopify.com/admin/api/2025-10/carrier_services.json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier_service": {
      "name": "Carbon Negative Local Delivery",
      "callback_url": "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates",
      "service_discovery": true
    }
  }'
```

---

## 📚 Related Documentation

- **[README.md](./README.md)** - Quick start and overview
- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - AI assistant coding guidelines
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Future microservices separation plan

---

## 🐛 Known Issues

1. **StopSuite Order Creation Returns 502**
   - Status: External API issue
   - Impact: Order sync doesn't work
   - Workaround: Manual order entry
   - Resolution: Wait for StopSuite to fix their demo environment

2. **Middleware Code Not Deployed**
   - Status: Intentional
   - Impact: No automatic order sync
   - Workaround: Manual order entry
   - Resolution: Deploy when needed, preferably in separate project

---

*Status: Carrier service successfully tested and working in production Shopify store ✅*
*Next Focus: Monitor production performance, prepare for v2 webhook integration when ready*

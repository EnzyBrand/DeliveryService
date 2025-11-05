# TODO - Enzy Delivery Middleware

**Current Branch:** `main`
**Last Updated:** November 4, 2025

> **📖 For project details, see [README.md](./README.md)**
> **🏗️ For architecture & API docs, see [ARCHITECTURE.md](./ARCHITECTURE.md)**
> **🧠 For coding guidelines, see [.claude/CLAUDE.md](./.claude/CLAUDE.md)**

---

## ✅ Current Status

**v1 is LIVE:** Carrier service deployed and working in production ✅

**Production URL:** `https://enzy-delivery-carrier-service.vercel.app`

**Not Deployed Yet:** Webhook handlers and order sync functionality (built but on hold)

---

## 📋 Active Tasks

### **Future Enhancements**
- [ ] **Add proper unit tests with Jest/Vitest**
  - [ ] Install test framework (Jest or Vitest)
  - [ ] Create `__tests__/` directory structure
  - [ ] Write unit tests for `lib/geocode.js`
  - [ ] Write unit tests for `api/zone-validator.js`
  - [ ] Write unit tests for `api/shipping-rates.js`
  - [ ] Set up test coverage reporting
  - [ ] Add `npm test` script to run tests
  - [ ] Uncomment test step in `.github/workflows/ci.yml`
- [ ] Add caching for geocoding results
- [ ] Add retry logic for StopSuite API calls
- [ ] Improve error logging/monitoring (Sentry, Datadog, etc.)
- [ ] Add performance metrics tracking

---

## 🔮 Future Work (v2+)

### **Webhook Integration & Order Automation**
- [ ] Deploy webhook handlers when StopSuite API is stable
- [ ] Register Shopify webhook for `orders/create`
- [ ] Test end-to-end order sync (Shopify → StopSuite → Shopify fulfillment)
- [ ] Add retry logic for failed syncs
- [ ] Add database for sync status tracking (PostgreSQL/MongoDB)

### **Multi-City Expansion**
- [ ] Consider microservices separation (see [ARCHITECTURE.md](./ARCHITECTURE.md))
- [ ] Support multiple compost partners (Compost KC, ATL, etc.)
- [ ] Dynamic partner routing based on service area

---

## 🎯 Current Focus

**Monitor production performance** and address any issues

**Gather real-world usage data** from Shopify integration

**Prepare for v2** when StopSuite webhook API is ready

---

## 📝 Quick Commands

### **Carrier Management**
```bash
npm run carrier:register         # Register carrier with Shopify
npm run carrier:list             # List registered carriers
npm run carrier:delete <ID>      # Delete carrier by ID
```

### **Testing**
```bash
npm run dev                      # Start local dev server
npm run test:order               # Test StopSuite order creation
npm run test:products            # Test StopSuite product fetching
curl https://enzy-delivery-carrier-service.vercel.app/health  # Health check
```

### **Deployment**
```bash
npm run deploy          # Deploy to production
# or
vercel --prod
```

---

**Status:** v1 is stable and working ✅

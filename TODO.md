# TODO - Enzy Delivery Middleware

**Project Status Tracking & Remaining Work**

**Last Updated:** November 5, 2025
**Current Branch:** `docs/update-readme-claude`

For project info and setup instructions, see [README.md](./README.md)
For future architecture plans, see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📊 Current Status

### ✅ Completed & Deployed
- [x] Shopify CarrierService API integration
- [x] Google Maps Geocoding integration
- [x] StopSuite zone validation API
- [x] HMAC-SHA256 authentication for StopSuite
- [x] Health check endpoint
- [x] Local development environment with Express
- [x] Vercel serverless deployment
- [x] Webhook handlers converted to Vercel format
- [x] Production deployment (Nov 5, 2025)
- [x] Deployment protection disabled
- [x] Code cleanup (~100 lines of duplicates removed)
- [x] Script organization into `/scripts/` folder
- [x] Documentation reorganization

### ⚠️ Built But Not Deployed
- [ ] Shopify webhook: `orders/create` → StopSuite sync
- [ ] StopSuite webhook: delivery completion → Shopify fulfillment
- [ ] Automatic order creation in StopSuite
- [ ] Route assignment automation

### 🐛 Known Issues
- **StopSuite Demo API Instability**
  - Issue: Order creation endpoint returns 502 errors intermittently
  - Impact: Cannot test end-to-end order sync
  - Workaround: Manual order entry in StopSuite
  - Resolution: Contact StopSuite support or wait for API stabilization

---

## 📋 Immediate Tasks (High Priority)

### 🚀 Deployment & Integration

#### 1. Register Shopify CarrierService
**Status:** ✅ Complete
**Priority:** High
**Completed:** November 5, 2025

**Tasks:**
- [x] Run `node scripts/update-carrier.js` with production URL
- [x] Verify carrier service appears in Shopify Admin → Settings → Shipping
- [ ] Test with test order in Shopify checkout (Next step)
- [ ] Verify rate appears correctly for Nashville addresses
- [ ] Verify fallback to default rates for non-Nashville addresses

**Success Criteria:**
- ✅ Carrier service registered with stable callback URL: `https://enzy-delivery-carrier-service-tristan2828s-projects.vercel.app/api/shipping-rates`
- ⏳ "Carbon Negative Local Delivery" appears as shipping option for eligible addresses (Needs testing)

**Note:** Using stable production URL that never changes (not deployment-specific URLs)

---

#### 2. Monitor Production Performance
**Status:** Not Started
**Priority:** High
**Estimated Time:** Ongoing

**Tasks:**
- [ ] Set up Vercel logging/monitoring
- [ ] Monitor response times for `/api/shipping-rates`
- [ ] Track Google Maps API usage and costs
- [ ] Track StopSuite API call volume
- [ ] Document any errors or performance issues

**Success Criteria:**
- Response time < 2 seconds (Shopify timeout limit)
- Error rate < 1%
- Zero customer-facing failures

---

### 🧪 Testing & Validation

#### 3. End-to-End Testing
**Status:** Not Started
**Priority:** High
**Estimated Time:** 2 hours

**Tasks:**
- [ ] Test checkout flow with Nashville address
  - [ ] Verify "Carbon Negative Local Delivery" appears
  - [ ] Verify rate is $4.99
  - [ ] Verify delivery date estimates
- [ ] Test checkout flow with non-Nashville address
  - [ ] Verify fallback to Shopify default rates
  - [ ] Verify no "Carbon Negative Local Delivery" option
- [ ] Test edge cases:
  - [ ] Invalid address (should fallback gracefully)
  - [ ] Partial address (missing street, etc.)
  - [ ] International address (should fallback)
  - [ ] PO Box address
- [ ] Document all test results

**Success Criteria:**
- All test cases pass
- No customer-facing errors
- Fallbacks work correctly

---

#### 4. Stress Testing
**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 1 hour

**Tasks:**
- [ ] Simulate multiple concurrent checkout requests
- [ ] Verify serverless function cold start times
- [ ] Test API rate limits (Google Maps, StopSuite)
- [ ] Verify error handling under load
- [ ] Document maximum throughput

**Success Criteria:**
- Handles 10+ concurrent requests without errors
- Cold start < 3 seconds
- No rate limit issues

---

## 📋 Near-Term Tasks (Medium Priority)

### 🔄 Webhook Activation (When Ready)

#### 5. Deploy Order Sync Webhooks
**Status:** Ready to Deploy
**Priority:** Medium
**Estimated Time:** 2 hours
**Blocked By:** StopSuite API stability

**Tasks:**
- [ ] Wait for StopSuite order creation API to stabilize
- [ ] Test webhook locally with ngrok
  - [ ] Mock Shopify `orders/create` webhook
  - [ ] Verify customer creation in StopSuite
  - [ ] Verify location creation in StopSuite
  - [ ] Verify shop order creation in StopSuite
- [ ] Register Shopify webhook in production:
  ```bash
  POST /admin/api/2024-01/webhooks.json
  {
    "webhook": {
      "topic": "orders/create",
      "address": "https://your-app.vercel.app/api/webhooks/order-created",
      "format": "json"
    }
  }
  ```
- [ ] Monitor webhook processing in Vercel logs
- [ ] Test with real order
- [ ] Verify order appears in StopSuite dashboard

**Success Criteria:**
- Orders automatically sync to StopSuite within 30 seconds
- Customer and location data correctly mapped
- Zero sync failures

---

#### 6. Deploy Fulfillment Webhooks
**Status:** Ready to Deploy
**Priority:** Medium
**Estimated Time:** 2 hours
**Blocked By:** Task #5 completion

**Tasks:**
- [ ] Register StopSuite webhook (if supported):
  - Webhook URL: `https://your-app.vercel.app/api/webhooks/stopsuite-complete`
  - Trigger: Delivery marked complete
- [ ] Test webhook with completed delivery
- [ ] Verify Shopify order marked as fulfilled
- [ ] Verify customer receives fulfillment email
- [ ] Monitor fulfillment accuracy

**Success Criteria:**
- Shopify orders auto-fulfill when delivery complete
- Customer notification emails sent correctly
- Fulfillment tracking updated

---

### 📈 Improvements & Optimization

#### 7. Add Caching Layer
**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 4 hours

**Tasks:**
- [ ] Implement geocoding cache (Redis or in-memory)
  - Cache key: full address string
  - TTL: 7 days
- [ ] Implement zone validation cache
  - Cache key: lat/lng coordinates
  - TTL: 24 hours
- [ ] Add cache hit/miss metrics
- [ ] Measure performance improvement

**Expected Impact:**
- Reduce Google Maps API calls by ~80%
- Reduce response time by ~500ms
- Lower API costs

---

#### 8. Improve Error Handling & Retry Logic
**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 3 hours

**Tasks:**
- [ ] Implement exponential backoff for StopSuite API calls
- [ ] Add dead letter queue for failed webhook processing
- [ ] Implement circuit breaker pattern for external APIs
- [ ] Add detailed error logging with context
- [ ] Create error alerting (email/Slack notifications)

**Success Criteria:**
- Transient errors automatically retry
- Permanent failures logged and alerted
- No customer-facing impact from API issues

---

#### 9. Add Observability & Monitoring
**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 4 hours

**Tasks:**
- [ ] Integrate with monitoring service (Datadog, Sentry, or LogRocket)
- [ ] Add custom metrics:
  - Rate calculation requests per hour
  - Zone validation hit/miss ratio
  - Average response time
  - Error rate by endpoint
- [ ] Set up alerts for:
  - Error rate > 5%
  - Response time > 3 seconds
  - API failures
- [ ] Create dashboards for:
  - Request volume over time
  - Geographic distribution of requests
  - API usage and costs

**Success Criteria:**
- Real-time visibility into system health
- Proactive alerting on issues
- Data-driven optimization decisions

---

## 📋 Future Enhancements (Low Priority)

### 🎯 Feature Additions

#### 10. Customer Recognition & Personalization
**Status:** Not Started
**Priority:** Low
**Estimated Time:** 8 hours

**Tasks:**
- [ ] Query StopSuite for existing customer by email
- [ ] Show different rate/message for existing customers
- [ ] Add "Welcome back!" messaging for returning customers
- [ ] Skip customer/location creation for existing customers

**Expected Impact:**
- Improved customer experience
- Reduced duplicate customer records
- Faster checkout for returning customers

---

#### 11. Multi-City Expansion
**Status:** Not Started
**Priority:** Low
**Estimated Time:** 16 hours
**Blocked By:** Proven success in Nashville

**Tasks:**
- [ ] Create zone validator plugins:
  - `api/zones/nashville.js`
  - `api/zones/kansas-city.js`
  - `api/zones/atlanta.js`
- [ ] Implement zone detection logic (by ZIP or coordinates)
- [ ] Configure per-city rates and service names
- [ ] Add city-specific branding/messaging
- [ ] Test multi-city routing

**Expected Impact:**
- Scale to multiple markets
- Support multiple compost partners
- Increase revenue potential

---

#### 12. Dynamic Route Assignment
**Status:** Not Started
**Priority:** Low
**Estimated Time:** 12 hours

**Tasks:**
- [ ] Query StopSuite for available routes on delivery date
- [ ] Implement auto-assignment algorithm:
  - Nearest route by distance
  - Route with available capacity
  - Balanced load distribution
- [ ] Handle assignment failures gracefully
- [ ] Add manual override option

**Expected Impact:**
- Reduce manual route assignment
- Optimize driver efficiency
- Faster order processing

---

#### 13. Advanced Rate Logic
**Status:** Not Started
**Priority:** Low
**Estimated Time:** 6 hours

**Tasks:**
- [ ] Implement tiered pricing:
  - Base rate: $4.99
  - Express delivery: $7.99
  - Weekend delivery: $6.99
- [ ] Add weight-based pricing
- [ ] Implement minimum order value
- [ ] Add promotional rate codes

**Expected Impact:**
- Flexible pricing options
- Revenue optimization
- Better customer choice

---

## 📋 Technical Debt & Maintenance

#### 14. Add Unit Tests
**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 12 hours

**Tasks:**
- [ ] Set up Jest or Vitest
- [ ] Write tests for `lib/geocode.js`
- [ ] Write tests for `lib/stopsuite-sync.js`
- [ ] Write tests for `api/zone-validator.js`
- [ ] Write tests for `api/shipping-rates.js`
- [ ] Set up test coverage reporting (>80% target)
- [ ] Add CI test step to GitHub Actions

**Success Criteria:**
- >80% code coverage
- All critical paths tested
- Tests run in CI/CD pipeline

---

#### 15. Improve Documentation
**Status:** Not Started
**Priority:** Low
**Estimated Time:** 4 hours

**Tasks:**
- [ ] Add inline code comments for complex logic
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Add troubleshooting guide
- [ ] Document common error scenarios and resolutions
- [ ] Create deployment runbook

---

#### 16. Security Hardening
**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 6 hours

**Tasks:**
- [ ] Implement rate limiting on public endpoints
- [ ] Add request validation middleware
- [ ] Audit environment variable usage
- [ ] Implement secrets rotation procedure
- [ ] Add security headers (helmet.js)
- [ ] Run security audit (npm audit, Snyk)

**Success Criteria:**
- Zero critical vulnerabilities
- Rate limiting prevents abuse
- Secrets properly secured

---

## 📅 Timeline Estimate

### Phase 1: Production Launch (1-2 weeks)
- Tasks #1-4: Testing and monitoring
- Goal: Stable carrier service in production

### Phase 2: Order Automation (2-4 weeks)
- Tasks #5-6: Webhook deployment
- Blocked by: StopSuite API stability
- Goal: End-to-end automation

### Phase 3: Optimization (4-6 weeks)
- Tasks #7-9: Caching, error handling, monitoring
- Goal: Production-grade reliability

### Phase 4: Future Features (Ongoing)
- Tasks #10-13: Feature additions
- Goal: Scale and expand capabilities

---

## 🔗 Related Documentation

- **[README.md](./README.md)** - Project setup and usage
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Future service separation plan
- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - Coding guidelines

---

**Note:** This is a living document. Update priorities and status as work progresses.

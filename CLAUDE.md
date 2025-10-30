# CLAUDE.md

Instructions for AI coding assistants (Claude, GPT, etc.) working with this codebase.

---

## 🎯 Project Purpose

**Enzy Delivery Carrier Service** - Shopify CarrierService integration that provides dynamic delivery rates at checkout based on StopSuite service zone validation.

**CRITICAL**: This is a production service. Carrier service failures = customers can't checkout.

---

## 🏗️ Architecture Overview

### Two Services in One Codebase
1. **Carrier Service** (CRITICAL - deployed, in production)
   - `api/shipping-rates.js` - Main endpoint
   - `api/zone-validator.js` - StopSuite zone validation
   - `lib/geocode.js` - Google Maps geocoding

2. **Order Middleware** (OPTIONAL - built but not deployed)
   - `api/webhooks/order-created.js` - Shopify → StopSuite sync
   - `api/webhooks/stopsuite-complete.js` - StopSuite → Shopify fulfillment
   - `lib/stopsuite-sync.js` - Order sync logic

**Future Plan:** Split into two separate projects. See [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 📁 File Structure

```
/api/                          # Vercel serverless functions
  ├── shipping-rates.js        # ✅ CARRIER SERVICE - Main endpoint
  ├── zone-validator.js        # ✅ CARRIER SERVICE - Zone validation
  ├── health.js                # ✅ CARRIER SERVICE - Health check
  └── webhooks/                # ⚠️ MIDDLEWARE - Not deployed yet
      ├── order-created.js     # Shopify → StopSuite order sync
      └── stopsuite-complete.js # StopSuite → Shopify fulfillment

/lib/                          # Shared libraries
  ├── geocode.js               # ✅ CARRIER SERVICE - Google Maps geocoding
  └── stopsuite-sync.js        # ⚠️ MIDDLEWARE - Order sync functions

/web/                          # Development files
  └── index.js                 # Express dev server (local development only)

/ (root)
  ├── dev-carrier-server.js    # Development server with /test endpoint
  ├── register-carrier.js      # CLI: Register carrier with Shopify
  ├── list-carriers.js         # CLI: List carriers
  ├── delete-carrier.js        # CLI: Delete carriers
  ├── test-shoporder.js        # Order sync tests
  └── test-products.js         # Product integration tests
```

---

## 🔧 Code Conventions

### Module System
- **ES Modules ONLY** - Use `import`/`export`, never `require()`
- Top-level `await` is supported in CLI scripts

### Logging Style
Use emoji-prefixed logs for visual scanning:
```javascript
console.log('🧾 Sending StopSuite payload:', payload);
console.log('📍 Geocoding address:', address);
console.log('✅ Success:', result);
console.log('⚠️ Warning:', warning);
console.log('❌ Error:', error);
```

### Error Handling Philosophy
**Carrier Service:** ALWAYS return safe fallback - never throw unhandled errors
```javascript
try {
  // Try to get custom rate
  const rate = await calculateRate(address);
  return res.json({ rates: [rate] });
} catch (error) {
  console.error('❌ Error:', error.message);
  // Return empty array = Shopify shows defaults
  return res.json({ rates: [] });
}
```

### API Authentication
StopSuite uses HMAC-SHA256 with timestamp + nonce:
```javascript
const message = `${method}|${path}|${timestamp}|${nonce}|${body}`;
const signature = crypto.createHmac('sha256', SECRET_KEY)
  .update(message)
  .digest('hex');
```

---

## 🛠️ When Making Changes

### Carrier Service Changes (Critical Path)
1. **Read before editing** - Always use Read tool before Edit
2. **Test locally** - `npm run start:dev`
3. **Test with ngrok** - `ngrok http 3000`
4. **Deploy carefully** - `vercel --prod`
5. **Monitor health endpoint** - Check `/health` after deploy

### Middleware Changes (Non-Critical)
- Middleware code is NOT deployed yet
- Feel free to refactor/improve
- Will move to separate repo later

### Adding New Features
- **Carrier service** = Add to `api/shipping-rates.js` or `api/zone-validator.js`
- **Order sync** = Add to `lib/stopsuite-sync.js`
- **Webhooks** = Add to `api/webhooks/`

---

## 🚫 Important Constraints

### DON'T
- ❌ Use CommonJS (`require()`/`module.exports`)
- ❌ Hardcode ZIP codes or coordinates
- ❌ Let carrier service throw unhandled errors
- ❌ Use blocking/sync operations
- ❌ Store state in memory (serverless = stateless)

### DO
- ✅ Use ES modules (`import`/`export`)
- ✅ Load all secrets from `process.env`
- ✅ Use `async`/`await` for async operations
- ✅ Return empty array on carrier service errors
- ✅ Log with emoji prefixes
- ✅ Add HMAC authentication to StopSuite calls
- ✅ Test with ngrok before production deploy

---

## 🔌 API Integrations

### Google Maps Geocoding API
```javascript
// lib/geocode.js
import fetch from 'node-fetch';

export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return { lat: data.results[0].geometry.location.lat, lng: ... };
}
```

### StopSuite Zone Validation API
```javascript
// api/zone-validator.js
export async function validateDeliveryZone(lat, lng) {
  const payload = JSON.stringify({ lat, lng });
  const signature = generateSignature('POST', '/api/check-service-area/', payload);

  const res = await fetch(STOPSUITE_API, {
    method: 'POST',
    headers: {
      'X-API-Key': STOPSUITE_API_KEY,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'Content-Type': 'application/json'
    },
    body: payload
  });

  const data = await res.json();
  return { inside: !!data?.service_area?.name, zoneName: data?.service_area?.name };
}
```

### Shopify CarrierService Response Format
```javascript
// api/shipping-rates.js
return res.json({
  rates: [
    {
      service_name: "Carbon Negative Local Delivery",
      service_code: "CARBON_NEGATIVE_LOCAL",
      total_price: "499", // Cents (not dollars!)
      currency: "USD",
      min_delivery_date: "2025-10-15",
      max_delivery_date: "2025-10-17"
    }
  ]
});
```

---

## 🧪 Testing Strategy

### Local Integration Tests
```bash
npm run start:dev     # Start dev server
curl http://localhost:3000/test  # Run internal test suite
```

### Production Testing
```bash
# Test health
curl https://enzy-delivery-carrier-service.vercel.app/health

# Test with address
curl -X POST https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"postal_code":"37201","city":"Nashville","province":"TN","country":"US"}}}'
```

---

## 🚀 Deployment

### Vercel Serverless Functions
- **Platform**: Vercel
- **Runtime**: Node.js 18
- **Timeout**: 10 seconds (carrier service is <2 sec)
- **Cold Start**: Optimize for fast cold starts

### Environment Variables (Production)
Set in Vercel dashboard:
```env
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...
```

### Deployment Command
```bash
vercel --prod
```

---

## 📊 Performance Requirements

### Carrier Service
- **Response Time**: <2 seconds (Shopify requirement)
- **Typical Performance**: 300-500ms
- **Error Rate**: <0.1% (critical path)

### Middleware (Future)
- **Response Time**: 5-10 seconds acceptable
- **Error Rate**: <1% (non-critical, can retry)

---

## 🔄 Data Flow

### Carrier Service Request
```
Shopify → POST /api/shipping-rates
  {
    "rate": {
      "destination": {
        "address1": "123 Main St",
        "city": "Nashville",
        "postal_code": "37201",
        ...
      }
    }
  }

↓ Geocode address (Google Maps)
↓ Validate zone (StopSuite)
↓ Return rate or empty array

Response:
  { "rates": [...] }  // or { "rates": [] } for fallback
```

---

## 🧠 Context for AI Assistants

### When Reading This Codebase
- Carrier service is PRODUCTION and CRITICAL
- Middleware code is BUILT but NOT DEPLOYED
- Two services will be SPLIT LATER (see ARCHITECTURE.md)
- `/web/index.js` is for local development only - production uses `/api/` endpoints

### When Writing Code
- Prioritize carrier service reliability over features
- Always include error fallbacks
- Use emoji logging for debugging
- Test locally before deployment
- Update relevant docs (README, TODO, CLAUDE)

### When Debugging
- Check Vercel logs: `vercel logs`
- Test health endpoint first: `curl .../health`
- Use `/test` endpoint for quick validation
- Check StopSuite API status if zone validation fails

---

## 📚 Additional Resources

- **[TODO.md](./TODO.md)** - Current tasks and status
- **[README.md](./README.md)** - Quick start guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Separation plan
- **[Shopify CarrierService Docs](https://shopify.dev/docs/api/admin-rest/latest/resources/carrierservice)**
- **[StopSuite API](https://demo4.stopsuite.com/)**

---

*Last updated: October 29, 2025*
*Branch: feature/compost-nashville-delivery*

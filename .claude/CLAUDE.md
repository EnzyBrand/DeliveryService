# 🧭 CLAUDE.md

**AI Coding Assistant Guidelines for Enzy Delivery Middleware**

This file contains coding style rules and development guidelines for AI assistants working on this project.

> **📖 For project details, architecture, and setup instructions, see [README.md](../README.md)**

---

## 🎯 Project Quick Reference

**What this project does:** Shopify ↔ StopSuite integration for carbon-negative delivery rates

**Current status:** v1 carrier service deployed ✅ | Webhook middleware built but not deployed ⚠️

**Architecture docs:** See [ARCHITECTURE.md](../ARCHITECTURE.md) for v2 separation plan

**Task tracking:** See [TODO.md](../TODO.md) for active work

---

## 🧱 Coding Style Rules

### **Language & Syntax**
- ✅ Use **ES Modules** (`import`/`export`) — NO CommonJS (`require`)
- ✅ Use **async/await** — NO raw `.then()` chains
- ✅ Use **node-fetch** (ESM version) for all HTTP requests
- ✅ Use **descriptive variable names** (e.g., `coordinates` not `coords`)

### **Emoji-Based Logging**
Maintain consistent emoji logging throughout the codebase:
```javascript
console.log("📨 Shipping rate request received")
console.log("🧾 Sending StopSuite payload:", payload)
console.log("🌐 StopSuite GET /routes/")
console.log("✅ Success:", result)
console.warn("⚠️ Warning: Falling back to default")
console.error("❌ Error:", error.message)
console.log("🔐 HMAC signature generated")
console.log("📍 Geocoding address...")
console.log("🚗 Creating driver action")
```

### **Error Handling**
- ✅ Always use try/catch blocks for async operations
- ✅ Log errors with context (request ID, address, etc.)
- ✅ Gracefully fall back to Shopify defaults on failures
- ✅ Never expose secrets in error messages

Example:
```javascript
try {
  const result = await geocodeAddress(address);
  console.log("✅ Geocoded:", result);
} catch (error) {
  console.error("❌ Geocoding failed:", error.message);
  return res.json({ rates: [] }); // Fallback to Shopify default
}
```

---

## 🔒 Security Rules

### **API Credentials**
- ❌ **NEVER** hardcode API keys, secrets, or credentials
- ✅ **ALWAYS** use `process.env.VARIABLE_NAME`
- ✅ **ALWAYS** check for missing environment variables before making API calls

Example:
```javascript
const API_KEY = process.env.STOPSUITE_API_KEY;
if (!API_KEY) {
  console.error("❌ Missing STOPSUITE_API_KEY");
  return;
}
```

### **HMAC Authentication**
- ✅ **ALWAYS** use StopSuite's HMAC-SHA256 signing for Client API requests
- ✅ Signature format: `METHOD|PATH|TIMESTAMP|NONCE|BODY`
- ✅ Use `crypto.createHmac('sha256', SECRET_KEY)`

### **Sensitive Data**
- ❌ **NEVER** log full API responses containing customer data
- ❌ **NEVER** commit `.env` files
- ✅ Sanitize logs before committing code

---

## 🧩 Code Organization

### **Where to Add New Features**

| Feature Type | Location | Example |
|--------------|----------|---------|
| New API endpoint | `/api/` | `api/new-endpoint.js` |
| Webhook handler | `/api/webhooks/` | `api/webhooks/new-webhook.js` |
| StopSuite utilities | `/lib/` | `lib/stopsuite-helper.js` |
| Zone validation | `/api/` | `api/zone-validator.js` |
| Dev/testing scripts | `/scripts/` | `scripts/test-feature.js` |
| New city/partner | `/api/zones/` (future) | `api/zones/kc-validator.js` |

### **Import Path Rules**
- ✅ Use relative imports: `import { geocode } from '../lib/geocode.js'`
- ✅ Always include `.js` extension in imports
- ✅ Keep utilities in `/lib/`, endpoints in `/api/`, scripts in `/scripts/`
- ⚠️ **CRITICAL:** Never import from `dev-carrier-server.js` in production `/api/` files
  - Bad: `import { CONSTANT } from '../../dev-carrier-server.js'`
  - Good: Define constants locally or in `/lib/` shared utilities

### **Module Structure**
```javascript
// 1. Imports
import fetch from 'node-fetch';
import crypto from 'crypto';

// 2. Constants
const API_BASE = 'https://api.example.com';

// 3. Helper functions
function helperFunction() { ... }

// 4. Main export (for Vercel serverless)
export default async function handler(req, res) { ... }
```

---

## 🧪 Testing Guidelines

### **Before Committing**
- ✅ Test carrier service endpoint locally: `npm run dev`
- ✅ Test StopSuite integration: `npm run test:order`
- ✅ Test product fetching: `npm run test:products`
- ✅ Check for console errors and warnings
- ✅ Verify ngrok tunnel works with Shopify

### **When Adding New Endpoints**
- ✅ Add corresponding test script in `/scripts/` (e.g., `scripts/test-new-feature.js`)
- ✅ Add npm script in `package.json` for easy access
- ✅ Document in README.md under "API Endpoints"
- ✅ Update TODO.md if not deployed yet

### **Utility Scripts**
All development and testing scripts are located in `/scripts/`:
- `npm run carrier:list` - List Shopify carrier services
- `npm run carrier:register` - Register carrier with Shopify
- `npm run carrier:delete <ID>` - Delete carrier service by ID
- `npm run test:order` - Test StopSuite order creation
- `npm run test:products` - Test StopSuite product fetching

---

## 🚨 Important Constraints

### **StopSuite APIs**
This project integrates with **TWO separate StopSuite APIs:**

1. **Zone Validation API** (used by carrier service)
   - Base: `https://demo4.stopsuite.com/api/check-service-area/`
   - No HMAC required
   - Used in: `api/zone-validator.js`

2. **Client API** (used by order middleware)
   - Base: `https://demo4.stopsuite.com/api/client/`
   - HMAC-SHA256 required
   - Used in: `lib/stopsuite-sync.js`, `api/routes/fetch-active.js`

**See [ARCHITECTURE.md](../ARCHITECTURE.md) for complete endpoint documentation.**

### **Vercel Deployment**
- ✅ All `/api/*.js` files are serverless functions
- ✅ 10-second timeout limit (must respond quickly)
- ✅ Each function is isolated (no shared state)

### **Future Architecture**
- 🔮 v2 will split into two services: `enzy-rates` and `enzy-ops`
- 🔮 Keep code modular to facilitate future separation
- 🔮 See [ARCHITECTURE.md](../ARCHITECTURE.md) for migration plan

---

## ✅ Quick Checklist for New Code

Before committing new code, verify:

- [ ] Uses ES Modules (`import`/`export`)
- [ ] Uses async/await (no `.then()`)
- [ ] Includes emoji-based logging
- [ ] No hardcoded secrets (uses `process.env`)
- [ ] Proper error handling with try/catch
- [ ] HMAC signing for StopSuite Client API calls
- [ ] Follows existing file organization
- [ ] Tested locally with `npm run test:carrier` or similar
- [ ] Updated README.md if adding new endpoint
- [ ] Updated TODO.md if feature isn't deployed yet

---

## 📚 Additional Resources

- **[README.md](../README.md)** - Complete project documentation
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - API details & v2 separation plan
- **[TODO.md](../TODO.md)** - Active tasks & roadmap

---

**Remember:** This is a production service handling real customer checkouts. Code quality, reliability, and security are critical! 🚀

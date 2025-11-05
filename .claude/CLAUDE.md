# CLAUDE.md - Coding Guidelines

**Coding Style Rules and Development Guidelines for AI Assistants**

This file contains coding style rules and development guidelines for AI assistants working on this project. For project info, see [README.md](../README.md). For remaining work, see [TODO.md](../TODO.md).

---

## 🧱 Code Style & Syntax

### JavaScript/Node.js Standards

**Module System:**
```javascript
// ✅ CORRECT - Use ES Modules
import fetch from 'node-fetch';
import { geocodeAddress } from '../lib/geocode.js';

export default async function handler(req, res) {
  // ... code
}

// ❌ WRONG - No CommonJS
const fetch = require('node-fetch');
module.exports = handler;
```

**Async/Await:**
```javascript
// ✅ CORRECT - Always use async/await
async function fetchData() {
  const data = await apiCall();
  return data;
}

// ❌ WRONG - No raw .then() chains
function fetchData() {
  return apiCall().then(data => data);
}
```

**HTTP Requests:**
```javascript
// ✅ CORRECT - Use node-fetch (ESM version)
import fetch from 'node-fetch';
const response = await fetch(url, options);

// ❌ WRONG - Don't use axios or other libraries
```

---

## ⚡ Vercel Serverless Function Rules

### CRITICAL: Vercel Deployment Format

All files in `/api/` must follow Vercel serverless function format:

```javascript
// ✅ CORRECT - Vercel serverless function format
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ... handler code
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ❌ WRONG - Express Router won't work in Vercel
import express from 'express';
const router = express.Router();
router.post('/endpoint', handler);
export default router;
```

### Request/Response Handling

```javascript
// ✅ CORRECT - Vercel provides req/res automatically
export default async function handler(req, res) {
  // Access headers
  const apiKey = req.headers['x-api-key'];

  // Access body (already parsed)
  const data = req.body;

  // Set headers
  res.setHeader('Content-Type', 'application/json');

  // Return response
  return res.status(200).json({ result: data });
}

// ❌ WRONG - Don't use Express middleware
app.use(express.json());  // Vercel handles this
```

---

## 🔒 Security Best Practices

### Environment Variables

```javascript
// ✅ CORRECT - Always use process.env
const apiKey = process.env.STOPSUITE_API_KEY;
const secretKey = process.env.STOPSUITE_SECRET_KEY;

if (!apiKey || !secretKey) {
  throw new Error('Missing required environment variables');
}

// ❌ WRONG - Never hardcode secrets
const apiKey = 'pk_1234567890abcdef';
```

### HMAC Signature Verification

```javascript
// ✅ CORRECT - Always verify HMAC signatures
import crypto from 'crypto';

const hmacHeader = req.headers['x-shopify-hmac-sha256'];
const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

const generatedHash = crypto
  .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
  .update(body, 'utf8')
  .digest('base64');

if (generatedHash !== hmacHeader) {
  return res.status(401).send('Unauthorized');
}

// ❌ WRONG - Don't skip verification
// Just process req.body without checking signature
```

### Logging

```javascript
// ✅ CORRECT - Never log sensitive data
console.log('Processing order:', order.id);
console.log('Customer:', {
  id: customer.id,
  email: customer.email.replace(/(?<=.).(?=[^@]*?.@)/g, '*')  // Mask email
});

// ❌ WRONG - Don't log full objects with sensitive data
console.log('Full order:', order);  // May contain payment info
console.log('API Key:', apiKey);    // Never log secrets
```

---

## 📝 Logging & Error Handling

### Emoji-Based Logging Convention

Use consistent emoji prefixes for log levels:

```javascript
// Request/response flow
console.log('🌐 Making request to:', url);
console.log('🧾 Payload:', payload);

// Success
console.log('✅ Request successful:', result);

// Warnings/fallbacks
console.warn('⚠️ Geocoding failed, falling back to defaults');

// Errors
console.error('❌ API error:', error.message);

// Debugging
console.log('🧩 Intermediate result:', data);
console.log('🔍 Inspecting value:', value);

// Testing
console.log('🧪 Running test:', testName);
```

### Error Handling Pattern

```javascript
// ✅ CORRECT - Always try/catch with graceful fallbacks
export default async function handler(req, res) {
  const requestId = Date.now().toString();
  console.log(`\n[${requestId}] 📨 Request received`);

  try {
    const result = await processRequest(req.body);
    console.log(`[${requestId}] ✅ Success`);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[${requestId}] ❌ Error:`, error.message);
    // Graceful fallback - don't expose internal errors
    return res.status(500).json({
      error: 'Internal server error',
      requestId  // For debugging
    });
  }
}

// ❌ WRONG - Don't let errors crash
async function handler(req, res) {
  const result = await apiCall();  // Unhandled promise rejection
  res.json(result);
}
```

---

## 🧩 File Organization

### Module Structure

```
/api/                          # Vercel serverless functions
  ├── health.js                # Simple functions (no subdirs)
  ├── shipping-rates.js
  ├── zone-validator.js
  ├── webhooks/               # Grouped by feature
  │   ├── order-created.js
  │   └── stopsuite-complete.js
  └── routes/
      └── fetch-active.js

/lib/                          # Shared utilities (not deployed)
  ├── geocode.js               # Single-purpose modules
  └── stopsuite-sync.js

/scripts/                      # CLI tools & testing
  ├── test-*.js                # Test scripts
  ├── register-carrier.js      # Register new carrier service
  ├── update-carrier.js        # Update carrier callback URL
  ├── list-carriers.js         # List registered carriers
  └── delete-carrier.js        # Delete carrier service
```

### When to Create New Files

```javascript
// ✅ CORRECT - New API endpoint = new file in /api/
// api/calculate-distance.js
export default async function handler(req, res) {
  // ...
}

// ✅ CORRECT - Shared logic = new file in /lib/
// lib/distance-calculator.js
export function calculateDistance(lat1, lng1, lat2, lng2) {
  // ...
}

// ❌ WRONG - Don't put shared logic in /api/
// api/utils.js  // Wrong location, should be /lib/utils.js
```

---

## 🔄 StopSuite API Integration

### HMAC Signature Generation

```javascript
// ✅ CORRECT - Always sign requests with HMAC
import crypto from 'crypto';

function generateSignature(method, path, body = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();

  // Normalize path
  let normalizedPath = path.startsWith('/api/client/')
    ? path
    : `/api/client${path.startsWith('/') ? path : `/${path}`}`;

  if (!normalizedPath.endsWith('/')) normalizedPath += '/';

  // Create signature
  const message = `${method}|${normalizedPath}|${timestamp}|${nonce}|${body}`;
  const signature = crypto
    .createHmac('sha256', process.env.STOPSUITE_SECRET_KEY)
    .update(message, 'utf8')
    .digest('hex');

  return { timestamp, nonce, signature };
}

// Use in request
const { timestamp, nonce, signature } = generateSignature('POST', '/orders/', JSON.stringify(payload));
const headers = {
  'X-API-Key': process.env.STOPSUITE_API_KEY,
  'X-Signature': signature,
  'X-Timestamp': timestamp,
  'X-Nonce': nonce,
  'Content-Type': 'application/json',
};
```

### API Request Pattern

```javascript
// ✅ CORRECT - Standard StopSuite request pattern
async function stopSuiteRequest(method, path, bodyObj = null) {
  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  const { timestamp, nonce, signature } = generateSignature(method, path, body);

  const url = `${STOPSUITE_BASE_URL}${path.replace(/^\/+/, '')}`;

  console.log(`\n🌐 StopSuite ${method} ${url}`);
  if (body) console.log('📦 Body:', body);

  const response = await fetch(url, {
    method,
    headers: {
      'X-API-Key': process.env.STOPSUITE_API_KEY,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body || undefined,
  });

  const text = await response.text();

  try {
    const json = JSON.parse(text);
    console.log(`✅ StopSuite responded (${response.status})`, json);
    return json;
  } catch {
    console.warn(`⚠️ Non-JSON response (${response.status})`, text.slice(0, 200));
    return { raw: text, status: response.status };
  }
}
```

---

## 🎯 Shopify CarrierService Rules

### Rate Response Format

```javascript
// ✅ CORRECT - Return proper Shopify rate format
return res.json({
  rates: [
    {
      service_name: 'Carbon Negative Local Delivery',
      service_code: 'CARBON_NEGATIVE_LOCAL',
      total_price: '499',  // String, in cents
      currency: 'USD',
      min_delivery_date: '2025-11-06',  // ISO date format
      max_delivery_date: '2025-11-07',
    },
  ],
});

// Fallback to Shopify defaults
return res.json({ rates: [] });  // Empty array, not null

// ❌ WRONG - Invalid format
return res.json({
  rates: [{
    name: 'Delivery',     // Wrong key (should be service_name)
    price: 4.99,          // Wrong type (should be string in cents)
    total_price: '$4.99', // Wrong format (no $ sign)
  }],
});
```

### Cache Control Headers

```javascript
// ✅ CORRECT - Prevent Shopify from merging rates
res.setHeader('Cache-Control', 'no-store');
res.setHeader('X-Shopify-Carrier-Exclusive', 'true');

return res.json({ rates: [...] });
```

---

## 🛠️ Carrier Service Management

### Environment Variable Pattern

Scripts should support both production and local development URLs:

```javascript
// ✅ CORRECT - Flexible URL configuration
const { VERCEL_PRODUCTION_URL, NGROK_URL } = process.env;

// Use production URL if available, otherwise fall back to ngrok
const callbackBaseUrl = VERCEL_PRODUCTION_URL || NGROK_URL;

if (!callbackBaseUrl) {
  console.error("❌ No callback URL configured.");
  console.error("Set either VERCEL_PRODUCTION_URL (for production) or NGROK_URL (for local dev).");
  process.exit(1);
}

console.log(`🌐 Using callback URL: ${callbackBaseUrl}/api/shipping-rates`);
console.log(`📍 Environment: ${VERCEL_PRODUCTION_URL ? "Production (Vercel)" : "Local Development (ngrok)"}`);
```

### Script Usage Patterns

```bash
# Register new carrier service (first time)
node scripts/register-carrier.js

# List existing carrier services
node scripts/list-carriers.js

# Update callback URL (after redeploying to new Vercel URL)
node scripts/update-carrier.js <carrier_id>

# Delete carrier service
node scripts/delete-carrier.js <carrier_id>
```

### Carrier Service Scripts

**register-carrier.js** - Creates new carrier service
- Uses: POST `/admin/api/2025-10/carrier_services.json`
- When: First time setup
- Fails if: Carrier with same name already exists

**update-carrier.js** - Updates existing carrier's callback URL
- Uses: PUT `/admin/api/2025-10/carrier_services/{id}.json`
- When: After redeploying to new Vercel URL
- Requires: Carrier ID from `list-carriers.js`

**list-carriers.js** - Lists all registered carriers
- Uses: GET `/admin/api/2025-10/carrier_services.json`
- When: To find carrier ID for update/delete operations

**delete-carrier.js** - Removes carrier service
- Uses: DELETE `/admin/api/2025-10/carrier_services/{id}.json`
- When: Cleanup or testing

### Important: Vercel URL Types

**⚠️ Always use the STABLE production URL, not deployment-specific URLs**

Vercel generates two types of URLs:

```
❌ WRONG - Deployment-specific (changes every deploy):
https://project-pvk61xgx4-team.vercel.app
https://project-6stfv7dbi-team.vercel.app
https://project-fzl0kan9k-team.vercel.app

✅ CORRECT - Stable production URL (never changes):
https://project-team.vercel.app  (for team accounts)
https://project.vercel.app        (for personal accounts)
```

The stable URL automatically points to your latest production deployment.

**How to find your stable URL:**
- Team accounts: `https://<project-name>-<team-name>.vercel.app`
- Personal accounts: `https://<project-name>.vercel.app`
- Or run: `vercel domains ls` to see configured domains

**Why this matters:**
If you use deployment-specific URLs in `VERCEL_PRODUCTION_URL`, you'll have to update Shopify's carrier service after every deployment. Use the stable URL once and never update it again.

---

## 🧪 Testing Guidelines

### Test File Naming

```
scripts/
  ├── test-products.js       # test-*.js pattern
  ├── test-shoporder.js
  └── test-carrier.js

__tests__/                   # For unit tests (when added)
  ├── geocode.test.js
  └── zone-validator.test.js
```

### Test Script Pattern

```javascript
// ✅ CORRECT - Self-contained test scripts
import { stopSuiteRequest } from '../lib/stopsuite-sync.js';

console.log('🧪 Testing StopSuite product API...');

(async () => {
  try {
    const res = await stopSuiteRequest('GET', '/shop-products/');
    console.log('✅ Products:', res);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
})();
```

---

## 📦 Dependencies Management

### Package Installation

```bash
# ✅ CORRECT - Use npm
npm install package-name

# ❌ WRONG - Don't use yarn or pnpm (inconsistent with project)
yarn add package-name
```

### Adding New Dependencies

**Before adding a new dependency, ask:**
1. Is this needed or can I use built-in Node.js modules?
2. Does this work with ES Modules?
3. Does this work in Vercel serverless environment?
4. Is this actively maintained?

```javascript
// ✅ CORRECT - Minimal dependencies
import crypto from 'crypto';    // Built-in
import fetch from 'node-fetch'; // ESM-compatible

// Consider before adding
import axios from 'axios';      // Do we need this? node-fetch works fine
import lodash from 'lodash';    // Do we need the whole library? Use built-ins
```

---

## 🚫 Common Mistakes to Avoid

### Don't Use Express Middleware in Vercel Functions

```javascript
// ❌ WRONG
import express from 'express';
const app = express();
app.use(express.json());
export default app;

// ✅ CORRECT
export default async function handler(req, res) {
  // Vercel handles body parsing
  const data = req.body;
}
```

### Don't Forget Error Handling

```javascript
// ❌ WRONG
const data = await apiCall();
return res.json(data);

// ✅ CORRECT
try {
  const data = await apiCall();
  return res.json(data);
} catch (error) {
  console.error('❌ API call failed:', error.message);
  return res.status(500).json({ error: 'Service unavailable' });
}
```

### Don't Expose Internal Errors

```javascript
// ❌ WRONG - Exposes stack traces
catch (error) {
  return res.status(500).json({ error: error.stack });
}

// ✅ CORRECT - Generic error message
catch (error) {
  console.error('❌ Internal error:', error);
  return res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
}
```

---

## 🔗 Related Documentation

- **[README.md](../README.md)** - Project setup and overview
- **[TODO.md](../TODO.md)** - Remaining work
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Future separation plan

---

## 📝 Documentation Standards

### Code Comments

```javascript
// ✅ CORRECT - Comment complex logic, not obvious code
// Calculate distance using Haversine formula
const distance = calculateHaversine(lat1, lng1, lat2, lng2);

// Retry with exponential backoff (3 attempts max)
for (let i = 0; i < 3; i++) {
  try {
    return await apiCall();
  } catch (error) {
    if (i === 2) throw error;
    await sleep(Math.pow(2, i) * 1000);
  }
}

// ❌ WRONG - Obvious comments add no value
// Set variable to 1
const count = 1;

// Call function
doSomething();
```

### Function Documentation

```javascript
/**
 * Geocode an address to lat/lng coordinates
 * @param {string} address - Full address string
 * @returns {Promise<{lat: number, lng: number}|null>} Coordinates or null if not found
 */
export async function geocodeAddress(address) {
  // ... implementation
}
```

---

**Summary:** Follow these guidelines to ensure code consistency, Vercel compatibility, and maintainability. When in doubt, look at existing code patterns in this project.

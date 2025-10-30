# Enzy Delivery Carrier Service

A Shopify CarrierService integration that provides dynamic "Carbon Negative Local Delivery" rates at checkout based on StopSuite service zone validation.

**Production Endpoint:** `https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates`

---

## 🎯 What It Does

During Shopify checkout, this service:
1. Receives customer address from Shopify
2. Geocodes address using Google Maps API
3. Validates if address is within StopSuite service zones
4. Returns "Carbon Negative Local Delivery" ($4.99) if inside zone
5. Returns empty array (Shopify shows defaults) if outside zone

**Critical Feature:** Without this, customers can't see custom delivery options at checkout.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Shopify store with Admin API access
- Google Maps API key
- StopSuite API credentials

### Installation
```bash
git clone <repository-url>
cd enzy-delivery-app
npm install
cp .env.example .env
# Edit .env with your API keys
```

### Required Environment Variables
```env
STOPSUITE_API_KEY=pk_xxxxx
STOPSUITE_SECRET_KEY=sk_xxxxx
GOOGLE_MAPS_API_KEY=AIza...
```

### Run Locally
```bash
npm run start:dev
# Server starts at http://localhost:3000
```

### Deploy to Production
```bash
vercel --prod
# Add environment variables in Vercel dashboard
```

---

## 📚 Documentation

- **[TODO.md](./TODO.md)** - Current status, task tracking, and next steps
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant guidance for code changes
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Future microservices separation plan

---

## 🧪 Testing

### Health Check
```bash
curl https://enzy-delivery-carrier-service.vercel.app/health
```

### Test With Address
```bash
curl -X POST https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{
    "rate": {
      "destination": {
        "address1": "123 Broadway",
        "city": "Nashville",
        "province": "TN",
        "postal_code": "37201",
        "country": "US"
      }
    }
  }'
```

### Run Internal Tests
```bash
npm run start:dev
# Then visit http://localhost:3000/test
```

---

## 🔌 Shopify Integration

### Register Carrier Service
```bash
node register-carrier.js
# Or use the curl command in TODO.md
```

### Enable in Shopify
1. Go to **Settings → Shipping and delivery**
2. Enable third-party calculated shipping rates
3. Your carrier service should appear automatically

---

## 🏗️ Project Structure

```
/api/
  ├── shipping-rates.js      # Main carrier service endpoint
  ├── zone-validator.js      # StopSuite zone validation
  └── health.js              # Health check

/lib/
  ├── geocode.js             # Google Maps geocoding
  └── stopsuite-sync.js      # StopSuite order sync (future middleware)

/api/webhooks/               # Future middleware (order automation)
  ├── order-created.js       # Shopify → StopSuite
  └── stopsuite-complete.js  # StopSuite → Shopify
```

**Note:** This project currently contains both carrier service (CRITICAL) and order middleware (NICE-TO-HAVE). See [ARCHITECTURE.md](./ARCHITECTURE.md) for separation plan.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+ with ES modules
- **Framework**: Express.js
- **APIs**: Shopify CarrierService, Google Maps Geocoding, StopSuite
- **Deployment**: Vercel Serverless Functions
- **Authentication**: HMAC-SHA256 signatures

---

## 📖 Key Files

| File | Purpose |
|------|---------|
| `api/shipping-rates.js` | Shopify carrier service endpoint |
| `lib/geocode.js` | Google Maps address → coordinates |
| `api/zone-validator.js` | StopSuite zone validation |
| `dev-carrier-server.js` | Local development server |
| `register-carrier.js` | CLI tool to register with Shopify |

---

## 🔄 Data Flow

```
Shopify Checkout
    ↓
POST /api/shipping-rates
    ↓
Geocode address (Google Maps)
    ↓
Validate zone (StopSuite API)
    ↓
Return rate or empty array
    ↓
Shopify displays options to customer
```

---

## 🤝 Contributing

1. Make changes locally
2. Test with `npm run start:dev`
3. Test with real Shopify store using ngrok
4. Deploy to Vercel
5. Update relevant documentation

---

## 📝 License

UNLICENSED - Private project

---

## 🆘 Support

- Check [TODO.md](./TODO.md) for current status and known issues
- Review [CLAUDE.md](./CLAUDE.md) for code conventions
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

---

*Production Ready - Carrier service fully functional*

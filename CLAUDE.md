# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **headless commerce** Nashville carrier service for Shopify that offers conditional "Free Shipping with Nashville Compost" during checkout. The project is optimized for serverless deployment on Vercel and is **production ready**.

**Critical References**:
- See `README.md` for comprehensive documentation
- See `TODO.md` for current status and Shopify test integration steps

## Core Architecture

### Headless Commerce Serverless Architecture
- **Production**: Vercel serverless functions (`/api/shipping-rates.js`, `/api/health.js`)
- **Development**: Express.js server (`web/index.js`) and enhanced dev server (`dev-carrier-server.js`)
- **No OAuth complexity**: Direct Shopify API integration using Private Apps

### Carrier Service Flow
1. Shopify calls `POST /api/shipping-rates` during checkout
2. Address geocoded using local Nashville ZIP lookup (`web/helpers/geocoding.js`)
3. Zone validation via distance calculation (`web/helpers/zone-validator.js`)
4. Conditional shipping rates returned based on Nashville area detection (30km radius)

### Production Endpoints (Live)
- **Carrier Service**: `https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates`
- **Health Check**: `https://enzy-delivery-carrier-service.vercel.app/health`

## Development Commands

### Testing
```bash
# Test carrier service components only
npm run test:carrier

# Component tests cover geocoding, zone validation, error handling
```

### Development Servers
```bash
# Option 1: Express.js server (recommended for development)
npm start                    # Starts on http://localhost:3000

# Option 2: Development server with enhanced testing
npm run start:dev            # Starts on http://localhost:3000
# - Includes /test endpoint with sample Nashville/non-Nashville requests

# Option 3: Vercel dev server (tests production environment locally)
npm run vercel:dev           # Starts on http://localhost:3000
# - Mimics production Vercel environment exactly
```

### Deployment
```bash
# Deploy to Vercel production
npm run deploy               # or: vercel --prod

# Verify deployment
npm run verify
```

### Local Testing with ngrok
```bash
# Start development server
npm run start:dev

# In another terminal, expose via ngrok
ngrok http 3000

# Use ngrok URL for testing Shopify integration
```

## Key Implementation Details

### Geocoding Strategy
- **Local ZIP-based lookup only** - no external API dependencies
- Nashville area ZIPs (37201-37221 + suburbs) hardcoded in `web/helpers/geocoding.js`
- Returns `null` for non-Nashville ZIPs, triggering standard shipping only

### Zone Validation
- **30km radius** from Nashville center (36.1627, -86.7816)
- **Haversine formula** for distance calculation
- Local calculation only - no external API calls

### Error Handling Philosophy
- **Always return standard shipping** as fallback to prevent checkout failures
- Graceful degradation for any geocoding or validation errors
- No external API dependencies that could cause timeouts

## Current Status - PRODUCTION READY!

### ✅ Working
- **Production deployment**: Fully deployed on Vercel and operational
- **Carrier service logic**: All Nashville geocoding and zone validation working
- **API endpoints**: Both `/api/shipping-rates` and `/health` responding correctly
- **External access**: Publicly accessible without bypass tokens (ideal for carrier services)
- **Component tests**: All carrier service logic tests pass
- **Local development**: All server startup options functional

### 🧪 Next Steps
- **Shopify test integration**: Awaiting partner setup of development store and private app
- **End-to-end testing**: Test actual checkout flow with Nashville addresses

## File Structure Context

### Production (Vercel Serverless)
```
/api/
  ├── shipping-rates.js    ← Main production endpoint (Shopify calls this)
  └── health.js           ← Health check endpoint
```

### Development (Express.js)
```
/web/
  ├── index.js            ← Express server for local development
  └── api/
      ├── shipping-rates.js ← Same logic as /api/shipping-rates.js
      └── carrier-service.js ← Shopify registration helpers
```

### Shared Code
```
/web/helpers/
  ├── geocoding.js        ← Nashville ZIP → coordinates
  └── zone-validator.js   ← Distance-based zone validation
```

### Testing & Development
- `test-carrier-service.js` - Component tests for carrier logic
- `dev-carrier-server.js` - Development server with enhanced testing

### Configuration
- `vercel.json` - Modern minimal Vercel configuration
- `package.json` - ES modules, Express.js, axios dependencies
- `TODO.md` - Current status and Shopify integration guide

## Shopify Integration Notes

### Private App Setup Required
1. **Create Shopify Private App** with scopes: `read_shipping`, `write_shipping`
2. **Register Carrier Service** using curl command:
```bash
curl -X POST "https://your-shop.myshopify.com/admin/api/2023-07/carrier_services.json" \
  -H "X-Shopify-Access-Token: YOUR_PRIVATE_APP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier_service": {
      "name": "Nashville Compost Delivery",
      "callback_url": "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates",
      "service_discovery": true
    }
  }'
```

### Rate Response Format
Returns Shopify-compatible rate objects:
- Nashville area: Free compost shipping + standard shipping
- Non-Nashville: Standard shipping only
- Always includes fallback to prevent checkout failures

### Testing Commands
See `TODO.md` for comprehensive command line testing examples including:
- Health check validation
- Nashville ZIP testing (37201) - should get free compost option
- Non-Nashville ZIP testing (90210) - should get only standard shipping

## Debugging & Health Endpoints

### Production Endpoints
- `GET /health` - Health check (publicly accessible)
- `POST /api/shipping-rates` - Main carrier service endpoint

### Development Testing
- Use `npm run start:dev` for local testing
- Check `/test` endpoint for quick Nashville vs non-Nashville validation
- Use ngrok for testing Shopify integration: `ngrok http 3000`

### Command Line Testing
```bash
# Test health
curl -s "https://enzy-delivery-carrier-service.vercel.app/health"

# Test Nashville address (should get free compost)
curl -X POST "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"postal_code":"37201"}}}'
```
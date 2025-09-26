# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify app that implements a Nashville-area carrier service offering conditional "Free Shipping with Nashville Compost" during checkout. The app is built on the official Shopify CLI Node.js template with significant carrier service extensions.

**Critical Reference**: See `README-CARRIER-SERVICE.md` for comprehensive implementation details, current status, and architectural decisions.

## Core Architecture

### Dual Server Architecture
- **Full Shopify App**: `shopify app dev` - includes OAuth, frontend, and carrier service
- **Standalone Carrier Service**: `npm run start:standalone` - carrier service only, no OAuth dependency

### Carrier Service Flow
1. Shopify calls `POST /api/shipping-rates` during checkout
2. Address geocoded using local Nashville ZIP lookup (`web/helpers/geocoding.js`)
3. Zone validation via distance calculation (`web/helpers/zone-validator.js`)
4. Conditional shipping rates returned based on Nashville area detection (30km radius)

### Critical Endpoint Placement
Carrier service endpoints are placed **before** authentication middleware in `web/index.js`:
```javascript
// Carrier service endpoints (no auth) - Shopify calls these directly
app.post('/api/shipping-rates', handleShippingRates);
app.post('/api/register-carrier', registerCarrierService);

// Authentication middleware applied after carrier service endpoints
app.use("/api/*", shopify.validateAuthenticatedSession());
```

## Development Commands

### Building
```bash
# Build requires API key in environment
SHOPIFY_API_KEY=your_api_key npm run build
```

### Testing
```bash
# Test carrier service components only
npm run test:carrier

# Component tests cover geocoding, zone validation, error handling
```

### Development Servers
```bash
# Full Shopify app (includes OAuth, frontend)
shopify app dev
# Note: Currently has OAuth session loop issue

# Standalone carrier service (bypasses OAuth)
npm run start:standalone
# Then use ngrok: ngrok http 3000
```

### Tunnel Services
- **Cloudflare tunnels**: Auto-managed by `shopify app dev`, updates `shopify.app.toml`
- **ngrok**: Manual tunneling for standalone testing: `ngrok http 3000`

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

## Current Status (Reference README-CARRIER-SERVICE.md)

### Working
- Carrier service logic fully implemented and tested
- Standalone server works with ngrok
- Build process functional
- Local geocoding and zone validation

### Known Issues
- **Shopify OAuth loop**: `shopify app dev` has session validation failures
- App preview loads but shows authentication redirect loop
- Carrier service functionality is unaffected by OAuth issue

## File Structure Context

### Carrier Service Core
- `web/api/shipping-rates.js` - Main Shopify callback endpoint
- `web/api/carrier-service.js` - Shopify registration management
- `web/helpers/geocoding.js` - Nashville ZIP → coordinates
- `web/helpers/zone-validator.js` - Distance-based zone validation

### Testing & Development
- `test-carrier-service.js` - Component tests for carrier logic
- `standalone-carrier-server.js` - OAuth-free development server

### Configuration
- `shopify.app.toml` - Includes `read_shipping,write_shipping` scopes
- `.env` - API keys, automatically managed APP_URL for Shopify CLI

## Shopify Integration Notes

### CarrierService Registration
- Use `/api/register-carrier` endpoint once OAuth issues resolved
- Tells Shopify to call `/api/shipping-rates` during checkout
- Service name: "Nashville Compost Delivery"

### Rate Response Format
Must return Shopify-compatible rate objects with required fields:
- `service_name`, `service_code`, `total_price` (cents as string)
- `currency`, `min_delivery_date`, `max_delivery_date`

### Development vs Production
- Development: Uses memory session storage, automatic tunnel URLs
- Production: Will need persistent session storage, stable URLs
- Carrier service logic identical between environments
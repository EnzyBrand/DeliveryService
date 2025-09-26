# Nashville Carrier Service - Next Steps

## ✅ **Current Status - PRODUCTION READY!**

### **Completed:**
- **✅ Carrier Service Logic**: All Nashville geocoding and zone validation working
- **✅ API Endpoint**: `/api/shipping-rates` responds correctly to external calls
- **✅ Component Tests**: All carrier service logic tests pass
- **✅ Headless Architecture**: Clean codebase optimized for headless commerce
- **✅ Local Development**: All server startup options functional
- **✅ CORS Support**: Proper headers for Shopify external calls
- **✅ External Access Validation**: ngrok tunnel testing confirms Shopify compatibility
- **✅ Vercel Deployment**: Serverless functions deployed and working perfectly
- **✅ Configuration Fixed**: Updated to modern vercel.json format
- **✅ Public Access**: Endpoints accessible without bypass tokens (ideal for carrier services)

### **Production Endpoints:**
- **🚀 Carrier Service**: `https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates`
- **📊 Health Check**: `https://enzy-delivery-carrier-service.vercel.app/health`

---

## 🧪 **TODO: Shopify Test Integration**

### **Step 1: Partner Setup (Shopify Side)**
**Ask your partner to:**

1. **Create Shopify Development Store**:
   - Go to [partners.shopify.com](https://partners.shopify.com)
   - Create a free development store for testing
   - **OR** use existing test/staging store

2. **Create Private App**:
   ```
   1. Go to Shopify Admin → Settings → Apps and sales channels
   2. Click "Develop apps" → "Create an app"
   3. App Name: "Nashville Carrier Service Test"
   4. Configure API scopes:
      - ✅ read_shipping
      - ✅ write_shipping
   5. Install the app and copy the Access Token
   ```

3. **Provide You With**:
   - Test store URL (e.g., `test-store-123.myshopify.com`)
   - Private App Access Token

### **Step 2: Register Carrier Service (Your Side)**
Once you have the test store details, run this command:

```bash
curl -X POST "https://TEST_STORE_NAME.myshopify.com/admin/api/2023-07/carrier_services.json" \
  -H "X-Shopify-Access-Token: PRIVATE_APP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier_service": {
      "name": "Nashville Compost Delivery (TEST)",
      "callback_url": "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates",
      "service_discovery": true
    }
  }'
```

### **Step 3: Test Checkout Flow**
Test these scenarios in the Shopify test store:

#### **✅ Nashville Address Test**
- **Address**: `123 Main St, Nashville, TN 37201`
- **Expected**: Should show "Free Shipping with Nashville Compost" option

#### **✅ Nashville Suburb Test**
- **Address**: `123 Main St, Franklin, TN 37064`
- **Expected**: Should show "Free Shipping with Nashville Compost" option

#### **❌ Non-Nashville Address Test**
- **Address**: `123 Main St, Los Angeles, CA 90210`
- **Expected**: Should show only "Standard Shipping" option

### **Step 4: Verify Integration**
Check that:
- [ ] Carrier service appears in Shopify checkout
- [ ] Nashville addresses get free compost option
- [ ] Non-Nashville addresses get only standard shipping
- [ ] No checkout errors occur
- [ ] Health endpoint remains accessible

---

## 📋 **Partner Information Sheet**

**Share this with your partner:**

```
🚀 Nashville Carrier Service - Ready for Test Integration

PRODUCTION ENDPOINTS:
- Carrier Service: https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates
- Health Check: https://enzy-delivery-carrier-service.vercel.app/health

WHAT IT DOES:
- Detects Nashville area addresses (ZIP codes 37201-37221, surrounding areas)
- Offers "Free Shipping with Nashville Compost" for Nashville area
- Provides standard shipping for all other locations
- Always falls back to standard shipping if any errors occur

TEST ADDRESSES TO TRY:
✅ Nashville Core: 37201, 37203, 37215 (should get free compost option)
✅ Nashville Suburbs: 37027 (Brentwood), 37064 (Franklin), 37115 (Madison)
❌ Non-Nashville: 90210 (Beverly Hills), 10001 (NYC), 60601 (Chicago)

REQUIRED SHOPIFY PERMISSIONS:
- read_shipping (to read shipping configurations)
- write_shipping (to register carrier service)

SERVICE NAME SUGGESTION:
"Nashville Compost Delivery (TEST)"
```

---

## 🚀 **After Successful Testing**

Once testing is complete and working:

1. **Register on Production Store**:
   - Use same process but with production Shopify store
   - Change name to "Nashville Compost Delivery" (remove "TEST")

2. **Monitor Health**:
   - Use health endpoint for uptime monitoring
   - Watch for any shipping rate errors in logs

3. **Documentation**:
   - Update README with successful integration notes
   - Document any edge cases discovered during testing

---

## 💻 **Command Line Testing Examples**

### **Test Health Endpoint**
```bash
curl -s "https://enzy-delivery-carrier-service.vercel.app/health"
```
**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-26T22:55:23.346Z",
  "service": "Enzy Delivery Carrier Service",
  "version": "1.0.0"
}
```

### **Test Nashville Address (Should Get Free Compost)**
```bash
curl -X POST "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "rate": {
      "destination": {
        "postal_code": "37201",
        "city": "Nashville",
        "province": "TN",
        "country": "US"
      }
    }
  }' \
  -s | jq '.'
```
**Expected Response:**
```json
{
  "rates": [
    {
      "service_name": "Free Shipping with Nashville Compost",
      "service_code": "NASH_COMPOST_FREE",
      "total_price": "0",
      "description": "Eco-friendly delivery with composting service",
      "currency": "USD",
      "min_delivery_date": "2025-09-28",
      "max_delivery_date": "2025-10-01"
    },
    {
      "service_name": "Standard Shipping",
      "service_code": "STANDARD",
      "total_price": "999",
      "description": "Standard delivery",
      "currency": "USD",
      "min_delivery_date": "2025-10-01",
      "max_delivery_date": "2025-10-03"
    }
  ]
}
```

### **Test Non-Nashville Address (Should Only Get Standard)**
```bash
curl -X POST "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "rate": {
      "destination": {
        "postal_code": "90210",
        "city": "Beverly Hills",
        "province": "CA",
        "country": "US"
      }
    }
  }' \
  -s | jq '.'
```
**Expected Response:**
```json
{
  "rates": [
    {
      "service_name": "Standard Shipping",
      "service_code": "STANDARD",
      "total_price": "999",
      "description": "Standard delivery",
      "currency": "USD",
      "min_delivery_date": "2025-10-01",
      "max_delivery_date": "2025-10-03"
    }
  ]
}
```

### **Test Nashville Suburb (Should Get Free Compost)**
```bash
curl -X POST "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "rate": {
      "destination": {
        "postal_code": "37064",
        "city": "Franklin",
        "province": "TN",
        "country": "US"
      }
    }
  }' \
  -s | jq '.'
```

### **Quick Test Script (Windows/Git Bash)**
Save this as `test-endpoints.sh`:
```bash
#!/bin/bash
echo "=== Testing Nashville Carrier Service ==="
echo

echo "1. Health Check:"
curl -s "https://enzy-delivery-carrier-service.vercel.app/health" | jq '.'
echo

echo "2. Nashville ZIP (37201) - Should get FREE compost option:"
curl -X POST "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"postal_code":"37201"}}}' \
  -s | jq '.rates[].service_name'
echo

echo "3. Non-Nashville ZIP (90210) - Should get ONLY standard:"
curl -X POST "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" \
  -H "Content-Type: application/json" \
  -d '{"rate":{"destination":{"postal_code":"90210"}}}' \
  -s | jq '.rates[].service_name'
echo

echo "=== Test Complete ==="
```

**Run with:** `bash test-endpoints.sh`

### **PowerShell Version (Windows)**
```powershell
# Test Health
Write-Host "=== Health Check ===" -ForegroundColor Green
Invoke-RestMethod -Uri "https://enzy-delivery-carrier-service.vercel.app/health"

# Test Nashville
Write-Host "`n=== Nashville Test (37201) ===" -ForegroundColor Green
$nashvilleBody = @{
  rate = @{
    destination = @{
      postal_code = "37201"
    }
  }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" -Method POST -Body $nashvilleBody -ContentType "application/json"

# Test Non-Nashville
Write-Host "`n=== Non-Nashville Test (90210) ===" -ForegroundColor Green
$nonNashvilleBody = @{
  rate = @{
    destination = @{
      postal_code = "90210"
    }
  }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://enzy-delivery-carrier-service.vercel.app/api/shipping-rates" -Method POST -Body $nonNashvilleBody -ContentType "application/json"
```

---

## 🔧 **Technical Notes**

### **Service Specifications:**
- **Coverage Area**: 30km radius from Nashville center (36.1627, -86.7816)
- **ZIP Codes Supported**: 37201-37221, plus suburbs (37027, 37064, 37067, 37115, 37122, 37138)
- **Response Format**: Shopify-compatible rate objects
- **Error Handling**: Graceful fallback to standard shipping
- **Performance**: <50ms response time for local ZIP lookup

### **Deployment Details:**
- **Platform**: Vercel serverless functions
- **Configuration**: Modern vercel.json (auto-detection)
- **Module System**: ES modules with proper imports
- **Protection**: Public access (no bypass tokens needed)

---

*Last updated: September 26, 2025*
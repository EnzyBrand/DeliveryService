#!/usr/bin/env node
import 'dotenv/config'; // ✅ Automatically loads .env variables
import express from 'express';
import cors from 'cors';
import handler from './api/shipping-rates.js';
import orderCreatedWebhook from './api/webhooks/order-created.js';
import stopsuiteCompleteWebhook from './api/webhooks/stopsuite-complete.js'; // ✅ NEW: StopSuite → Shopify webhook
// ✅ Global constants
export const STOPSUITE_BASE_URL = "https://demo4.stopsuite.com/api/client/";

// ✅ Confirm env variables are loaded
console.log('🧭 ENV Loaded:', {
  STOPSUITE_API_KEY: process.env.STOPSUITE_API_KEY ? '✅ present' : '❌ missing',
  STOPSUITE_SECRET_KEY: process.env.STOPSUITE_SECRET_KEY ? '✅ present' : '❌ missing',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ? '✅ present' : '❌ missing',
});

console.log(`🔗 Using StopSuite base URL: ${STOPSUITE_BASE_URL}`);

// ✅ Initialize Express
const app = express();

// ✅ Preserve raw request body for Shopify webhooks
app.use(
  express.json({
    type: '*/*',
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith('/api/webhooks')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

app.use(cors());

// ✅ Debugging middleware to log every incoming request
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enzy Delivery Carrier Service (Development)',
    version: '1.0.0',
  });
});

// ✅ Root info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Enzy Delivery Carrier Service',
    description:
      'Provides conditional free shipping for Nashville area deliveries',
    endpoints: {
      health: 'GET /health',
      shippingRates: 'POST /api/shipping-rates',
      orderWebhook: 'POST /api/webhooks/order-created',
      test: 'GET /test',
    },
  });
});

// ✅ Shopify carrier service route
app.post('/api/shipping-rates', handler);

// ✅ Mount Shopify webhook route
app.use('/api/webhooks', orderCreatedWebhook);

// ✅ Internal test endpoint
app.get('/test', async (req, res) => {
  console.log('\n🧪 Running internal test suite...\n');

  const testCases = [
    {
      name: 'Nashville Downtown',
      destination: {
        address1: '123 Broadway',
        city: 'Nashville',
        province: 'TN',
        postal_code: '37201',
        country: 'US',
      },
    },
    {
      name: 'Franklin, TN (Nashville area)',
      destination: {
        address1: '456 Main Street',
        city: 'Franklin',
        province: 'TN',
        postal_code: '37064',
        country: 'US',
      },
    },
    {
      name: 'Memphis, TN (outside Nashville)',
      destination: {
        address1: '789 Beale Street',
        city: 'Memphis',
        province: 'TN',
        postal_code: '38103',
        country: 'US',
      },
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`🚚 Testing: ${testCase.name}`);
      const mockReq = {
        method: 'POST',
        body: {
          rate: {
            destination: testCase.destination,
            items: [{ quantity: 1, grams: 1000 }],
          },
        },
      };

      let responseData = null;
      const mockRes = {
        setHeader: (key, value) => console.log(`🧩 setHeader(${key}, ${value})`),
        json: (data) => {
          responseData = data;
          console.log(
            `✅ Response returned for ${testCase.name}:`,
            JSON.stringify(data, null, 2)
          );
          return mockRes;
        },
        status: (code) => {
          console.log(`🔢 HTTP Status: ${code}`);
          return mockRes;
        },
      };

      await handler(mockReq, mockRes);

      results.push({
        name: testCase.name,
        status: 'success',
        rates: responseData?.rates || [],
      });
    } catch (error) {
      console.error(`❌ Error in ${testCase.name}:`, error);
      results.push({
        name: testCase.name,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log('\n✅ Internal tests complete.\n');
  res.json({
    service: 'Enzy Delivery Carrier Service Test',
    timestamp: new Date().toISOString(),
    results,
  });
});

// ✅ Smart port assignment
const DEFAULT_PORT = 3000;
const server = app.listen(DEFAULT_PORT, () => {
  console.log(`🚀 Enzy Delivery Carrier Service running on port ${DEFAULT_PORT}`);
  console.log(`📋 Health check: http://localhost:${DEFAULT_PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${DEFAULT_PORT}/test`);
  console.log(`🚚 Shipping rates: http://localhost:${DEFAULT_PORT}/api/shipping-rates`);
  console.log(`📬 Webhook: http://localhost:${DEFAULT_PORT}/api/webhooks/order-created`);
  console.log(`\n🌐 To expose via ngrok: ngrok http ${DEFAULT_PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = DEFAULT_PORT + 1;
    app.listen(fallbackPort, () => {
      console.log(`⚠️  Port ${DEFAULT_PORT} in use, switched to port ${fallbackPort}`);
      console.log(`📋 Health check: http://localhost:${fallbackPort}/health`);
      console.log(`🧪 Test endpoint: http://localhost:${fallbackPort}/test`);
      console.log(`🚚 Shipping rates: http://localhost:${fallbackPort}/api/shipping-rates`);
      console.log(`📬 Webhook: http://localhost:${fallbackPort}/api/webhooks/order-created`);
      console.log(`\n🌐 To expose via ngrok: ngrok http ${fallbackPort}`);
    });
  } else {
    console.error(err);
  }
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

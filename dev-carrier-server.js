#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fetch from 'node-fetch';

// ✅ Import routes
import shippingRatesHandler from './api/shipping-rates.js';
import orderCreatedWebhook from './api/webhooks/order-created.js';
import stopsuiteCompleteWebhook from './api/webhooks/stopsuite-complete.js';
import fetchActiveRoutes from './api/routes/fetch-active.js';

// ✅ Global constants
export const STOPSUITE_BASE_URL = "https://demo4.stopsuite.com/api/client/";

// ✅ Confirm env variables are loaded
console.log('🧭 ENV Loaded:', {
  STOPSUITE_API_KEY: process.env.STOPSUITE_API_KEY ? '✅ present' : '❌ missing',
  STOPSUITE_SECRET_KEY: process.env.STOPSUITE_SECRET_KEY ? '✅ present' : '❌ missing',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ? '✅ present' : '❌ missing',
});

console.log(`🔗 Using StopSuite base URL: ${STOPSUITE_BASE_URL}`);

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

// ✅ Debugging middleware
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enzy Delivery Carrier Service (Development)',
    version: '1.0.0',
  });
});

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Enzy Delivery Carrier Service',
    description: 'Provides conditional free shipping for Nashville area deliveries',
    endpoints: {
      health: 'GET /health',
      shippingRates: 'POST /api/shipping-rates',
      orderWebhook: 'POST /api/webhooks/order-created',
      stopsuiteWebhook: 'POST /api/webhooks/stopsuite-complete',
      fetchRoutes: 'GET /api/routes/fetch-active',
      testRoutes: 'GET /api/test-routes',
      test: 'GET /test',
    },
  });
});

// ✅ Shopify carrier service route
app.post('/api/shipping-rates', shippingRatesHandler);

// ✅ Webhooks
app.post('/api/webhooks/order-created', orderCreatedWebhook);
app.post('/api/webhooks/stopsuite-complete', stopsuiteCompleteWebhook);

// ✅ StopSuite Active Routes
app.get('/api/routes/fetch-active', fetchActiveRoutes);

/**
 * ✅ Signed StopSuite request helper
 */
function generateStopSuiteSignature(method, path, body = "") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const normalizedPath = path.startsWith("/api/client/")
    ? path
    : `/api/client${path.startsWith("/") ? path : `/${path}`}`;
  const message = `${method}|${normalizedPath}|${timestamp}|${nonce}|${body}`;
  const signature = crypto
    .createHmac("sha256", process.env.STOPSUITE_SECRET_KEY)
    .update(message, "utf8")
    .digest("hex");
  return { timestamp, nonce, signature };
}

/**
 * ✅ Test StopSuite route output (fully signed)
 */
app.get('/api/test-routes', async (req, res) => {
  try {
    console.log("🧪 Fetching raw StopSuite routes (signed request)...");
    const path = "/routes/";
    const { timestamp, nonce, signature } = generateStopSuiteSignature("GET", path);
    const url = `${STOPSUITE_BASE_URL}routes/`;

    const headers = {
      "X-API-Key": process.env.STOPSUITE_API_KEY,
      "X-Signature": signature,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "Accept": "application/json",
    };

    console.log("🧩 Signed headers:", headers);

    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();

    console.log("🧩 Raw StopSuite Response Preview:\n", text.slice(0, 500));

    res.setHeader("Content-Type", "application/json");
    res.status(response.status).send(text);
  } catch (err) {
    console.error("❌ Error fetching test routes:", err);
    res.status(500).json({ error: err.message });
  }
});

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
            `✅ Response for ${testCase.name}:`,
            JSON.stringify(data, null, 2)
          );
          return mockRes;
        },
        status: (code) => {
          console.log(`🔢 HTTP Status: ${code}`);
          return mockRes;
        },
      };

      await shippingRatesHandler(mockReq, mockRes);

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
const DEFAULT_PORT = 3001;
const server = app.listen(DEFAULT_PORT, () => {
  console.log(`🚀 Enzy Delivery Carrier Service running on port ${DEFAULT_PORT}`);
  console.log(`📋 Health check: http://localhost:${DEFAULT_PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${DEFAULT_PORT}/test`);
  console.log(`🚚 Shipping rates: http://localhost:${DEFAULT_PORT}/api/shipping-rates`);
  console.log(`📬 Order webhook: http://localhost:${DEFAULT_PORT}/api/webhooks/order-created`);
  console.log(`📦 StopSuite webhook: http://localhost:${DEFAULT_PORT}/api/webhooks/stopsuite-complete`);
  console.log(`🗺️  StopSuite Route Map: http://localhost:${DEFAULT_PORT}/api/routes/fetch-active`);
  console.log(`🔍 StopSuite Raw Response: http://localhost:${DEFAULT_PORT}/api/test-routes`);
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
      console.log(`📬 Order webhook: http://localhost:${fallbackPort}/api/webhooks/order-created`);
      console.log(`📦 StopSuite webhook: http://localhost:${fallbackPort}/api/webhooks/stopsuite-complete`);
      console.log(`🗺️  StopSuite Route Map: http://localhost:${fallbackPort}/api/routes/fetch-active`);
      console.log(`🔍 StopSuite Raw Response: http://localhost:${fallbackPort}/api/test-routes`);
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

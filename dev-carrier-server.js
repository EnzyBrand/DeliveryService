#!/usr/bin/env node
import express from 'express';
import dotenv from 'dotenv';
import { handleShippingRates } from './web/api/shipping-rates.js';

dotenv.config();

const app = express();
app.use(express.json());

// CORS for external access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enzy Delivery Carrier Service (Development)',
    version: '1.0.0'
  });
});

// Root endpoint with information
app.get('/', (req, res) => {
  res.json({
    service: 'Enzy Delivery Carrier Service',
    description: 'Provides conditional free shipping for Nashville area deliveries',
    endpoints: {
      health: 'GET /health',
      shippingRates: 'POST /api/shipping-rates',
      test: 'GET /test'
    },
    example: {
      url: '/api/shipping-rates',
      method: 'POST',
      body: {
        rate: {
          destination: {
            address1: "123 Broadway",
            city: "Nashville",
            province: "TN",
            postal_code: "37201",
            country: "US"
          },
          items: [{ quantity: 1, grams: 1000 }]
        }
      }
    }
  });
});

// Main shipping rates endpoint - Called by Shopify during checkout
app.post('/api/shipping-rates', handleShippingRates);

// Test endpoint with sample data
app.get('/test', async (req, res) => {
  console.log('Test endpoint called');

  const testCases = [
    {
      name: "Nashville Downtown",
      destination: {
        address1: "123 Broadway",
        city: "Nashville",
        province: "TN",
        postal_code: "37201",
        country: "US"
      }
    },
    {
      name: "Franklin, TN (Nashville area)",
      destination: {
        address1: "456 Main Street",
        city: "Franklin",
        province: "TN",
        postal_code: "37064",
        country: "US"
      }
    },
    {
      name: "Memphis, TN (outside Nashville)",
      destination: {
        address1: "789 Beale Street",
        city: "Memphis",
        province: "TN",
        postal_code: "38103",
        country: "US"
      }
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      // Simulate the shipping rates request
      const mockReq = {
        body: {
          rate: {
            destination: testCase.destination,
            items: [{ quantity: 1, grams: 1000 }]
          }
        }
      };

      let responseData = null;
      const mockRes = {
        json: (data) => {
          responseData = data;
          return mockRes;
        },
        status: () => mockRes
      };

      // Call the handler directly
      await handleShippingRates(mockReq, mockRes);

      results.push({
        name: testCase.name,
        status: 'success',
        rates: responseData?.rates || []
      });
    } catch (error) {
      results.push({
        name: testCase.name,
        status: 'error',
        error: error.message
      });
    }
  }

  res.json({
    service: 'Enzy Delivery Carrier Service Test',
    timestamp: new Date().toISOString(),
    results
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Enzy Delivery Carrier Service (Development) running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🚚 Shipping rates: http://localhost:${PORT}/api/shipping-rates`);
  console.log(`\n🌐 To expose via ngrok: ngrok http ${PORT}`);
  console.log(`🔗 Then access: https://your-ngrok-url.ngrok-free.app/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
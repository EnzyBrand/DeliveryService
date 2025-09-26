// @ts-check

import dotenv from 'dotenv';
// Load env from parent directory since .env is at project root
dotenv.config({ path: '../.env' });

import express from "express";
import { registerCarrierService, listCarrierServices } from './api/carrier-service.js';
import { handleShippingRates } from './api/shipping-rates.js';

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const app = express();

// Enable CORS for external access (Shopify will call these endpoints)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// Health check endpoint - useful for monitoring and tunnel verification
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enzy Delivery Carrier Service',
    version: '1.0.0'
  });
});

// Test endpoint for quick verification
app.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Carrier service is running',
    endpoints: {
      health: '/health',
      shipping_rates: '/api/shipping-rates (POST)',
      register_carrier: '/api/register-carrier (POST)',
      list_carriers: '/api/list-carriers/:shop/:token (GET)'
    },
    timestamp: new Date().toISOString()
  });
});

// Main shipping rates endpoint - Called by Shopify during checkout
// This is the critical endpoint that Shopify will call
app.post('/api/shipping-rates', handleShippingRates);

// Admin endpoint to register carrier service with Shopify
app.post('/api/register-carrier', registerCarrierService);

// Admin endpoint to list carrier services
app.get('/api/list-carriers/:shop/:token', async (req, res) => {
  try {
    const services = await listCarrierServices(req.params.shop, req.params.token);
    res.json(services);
  } catch (error) {
    console.error('Error listing carrier services:', error);
    res.status(500).json({ error: 'Failed to list carrier services' });
  }
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['/health', '/test', '/api/shipping-rates', '/api/register-carrier'],
    method: req.method,
    path: req.originalUrl
  });
});

console.log(`🚀 Enzy Delivery Carrier Service starting on port ${PORT}`);
console.log(`📍 Health check: http://localhost:${PORT}/health`);
console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
console.log(`🚚 Shipping rates: http://localhost:${PORT}/api/shipping-rates`);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

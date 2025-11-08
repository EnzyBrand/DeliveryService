#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const { SHOPIFY_WEBHOOK_SECRET, VERCEL_PRODUCTION_URL } = process.env;

// Sample order payload (matches Shopify's format)
const testOrder = {
  id: 999999999,
  name: "#TEST-001",
  email: "test@example.com",
  customer: {
    id: 123456789,
    first_name: "Test",
    last_name: "Customer",
    email: "test@example.com",
    phone: "+1234567890"
  },
  billing_address: {
    address1: "123 Test St",
    city: "Atlanta",
    province: "GA",
    zip: "30307",
    country: "US"
  },
  shipping_address: {
    address1: "827 Lake Avenue Northeast",
    city: "Atlanta",
    province: "GA",
    zip: "30307",
    country: "US",
    latitude: 33.7591349,
    longitude: -84.36040709999999
  },
  line_items: [
    {
      id: 111111111,
      product_id: 222222222,
      sku: "BUCKET-001",
      title: "Compost Bucket",
      quantity: 1,
      price: "25.00"
    }
  ],
  note: "Test order for webhook verification"
};

async function sendTestWebhook() {
  const webhookUrl = `${VERCEL_PRODUCTION_URL}/api/webhooks/order-created`;
  const body = JSON.stringify(testOrder);

  // Generate HMAC signature (same way Shopify does)
  const hmac = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  console.log('🧪 Sending test webhook to:', webhookUrl);
  console.log('📦 Order:', testOrder.name);
  console.log('🔐 HMAC:', hmac.substring(0, 20) + '...\n');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Shop-Domain': '006sda-7b.myshopify.com',
        'X-Shopify-Topic': 'orders/create',
      },
      body: body,
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ Webhook accepted! Status:', response.status);
      console.log('📋 Response:', responseText);
      console.log('\n🎉 Check StopSuite to see if customer/order was created!');
    } else {
      console.error('❌ Webhook failed! Status:', response.status);
      console.error('📋 Response:', responseText);
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }
}

sendTestWebhook();

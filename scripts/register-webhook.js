#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL, VERCEL_PRODUCTION_URL, NGROK_URL } = process.env;

async function registerWebhook() {
  // Use production URL if available, otherwise fall back to ngrok for local dev
  const callbackBaseUrl = VERCEL_PRODUCTION_URL || NGROK_URL;

  if (!callbackBaseUrl) {
    console.error('❌ No callback URL configured.');
    console.error('Set either VERCEL_PRODUCTION_URL (for production) or NGROK_URL (for local dev).');
    process.exit(1);
  }

  const webhookUrl = `${callbackBaseUrl}/api/webhooks/order-created`;

  console.log(`🔗 Registering webhook with Shopify...`);
  console.log(`📍 Webhook URL: ${webhookUrl}`);
  console.log(`📍 Environment: ${VERCEL_PRODUCTION_URL ? 'Production (Vercel)' : 'Local Development (ngrok)'}\n`);

  const payload = {
    webhook: {
      topic: 'orders/create',
      address: webhookUrl,
      format: 'json',
    },
  };

  try {
    const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/2025-10/webhooks.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Webhook registered successfully!\n');
      console.log('📋 Webhook Details:');
      console.log(`   ID: ${data.webhook.id}`);
      console.log(`   Topic: ${data.webhook.topic}`);
      console.log(`   Address: ${data.webhook.address}`);
      console.log(`   Format: ${data.webhook.format}`);
      console.log(`   Created: ${data.webhook.created_at}`);
      console.log('\n✅ Orders will now be synced to StopSuite when created in Shopify!\n');
    } else {
      console.error('❌ Failed to register webhook:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error registering webhook:', error.message);
    process.exit(1);
  }
}

registerWebhook();

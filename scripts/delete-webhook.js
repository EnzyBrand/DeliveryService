#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL } = process.env;

const webhookId = process.argv[2];

if (!webhookId) {
  console.error('❌ Usage: node scripts/delete-webhook.js <webhook_id>');
  console.error('💡 Tip: Run "node scripts/list-webhooks.js" to get webhook IDs');
  process.exit(1);
}

async function deleteWebhook() {
  console.log(`🗑️  Deleting webhook ${webhookId}...`);

  const url = `https://${SHOPIFY_STORE_URL}/admin/api/2025-10/webhooks/${webhookId}.json`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_KEY,
    },
  });

  if (res.ok) {
    console.log(`✅ Webhook ${webhookId} deleted successfully`);
  } else {
    const data = await res.json();
    console.error('❌ Failed to delete webhook:');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

deleteWebhook();

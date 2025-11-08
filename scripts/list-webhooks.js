#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { SHOPIFY_ADMIN_API_KEY, SHOPIFY_STORE_URL } = process.env;

async function listWebhooks() {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/2025-10/webhooks.json`;

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  console.log('📦 Existing Webhooks:');
  console.log(JSON.stringify(data, null, 2));
}

listWebhooks();

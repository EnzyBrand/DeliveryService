#!/usr/bin/env node
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// ✅ Updated to match your live Vercel deployment
const VERCEL_URL = process.env.VERCEL_PRODUCTION_URL || 'https://delivery-service-umber.vercel.app';

// Test data matching Shopify's format
const testCases = [
  {
    name: 'Atlanta (Inside Zone - StopSuite Demo)',
    payload: {
      rate: {
        destination: {
          country: 'US',
          postal_code: '30307',
          province: 'GA',
          city: 'Atlanta',
          name: 'Jane Smith',
          address1: '827 Lake Avenue Northeast',
          address2: '',
        },
        items: [
          {
            name: 'Compost Bucket',
            sku: 'BUCKET-001',
            quantity: 1,
            grams: 1000,
            price: 2500,
          },
        ],
      },
    },
  },
  {
    name: 'Nashville (Outside Zone - For Demo)',
    payload: {
      rate: {
        destination: {
          country: 'US',
          postal_code: '37206',
          province: 'TN',
          city: 'Nashville',
          name: 'John Doe',
          address1: '1623 5th Ave N',
          address2: '',
        },
        items: [
          {
            name: 'Compost Bucket',
            sku: 'BUCKET-001',
            quantity: 1,
            grams: 1000,
            price: 2500,
          },
        ],
      },
    },
  },
];

async function testEndpoint(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('━'.repeat(60));

  try {
    const response = await fetch(`${VERCEL_URL}/api/shipping-rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.payload),
    });

    const data = await response.json();

    console.log(`📊 HTTP Status: ${response.status}`);
    console.log(`📦 Response:`, JSON.stringify(data, null, 2));

    if (data.rates && data.rates.length > 0) {
      console.log(`✅ Returned ${data.rates.length} rate(s):`);
      data.rates.forEach((rate) => {
        console.log(`   - ${rate.service_name}: $${(parseInt(rate.total_price) / 100).toFixed(2)}`);
      });
    } else {
      console.log(`⚠️ No custom rates returned (Shopify will show defaults)`);
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

async function runTests() {
  console.log(`🚀 Testing Shipping Rates Endpoint`);
  console.log(`🔗 URL: ${VERCEL_URL}/api/shipping-rates\n`);

  for (const testCase of testCases) {
    await testEndpoint(testCase);
  }

  console.log('\n✅ Tests complete\n');
}

runTests();

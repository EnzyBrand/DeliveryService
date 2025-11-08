#!/usr/bin/env node
// IMPORTANT: Load dotenv FIRST before importing any modules
import dotenv from 'dotenv';
dotenv.config();

// Now import modules that depend on process.env
import { validateDeliveryZone } from '../api/zone-validator.js';

async function testCoords(name, lat, lng) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 Coordinates: (${lat}, ${lng})`);
  console.log('━'.repeat(60));

  try {
    const result = await validateDeliveryZone(lat, lng);
    console.log(`📊 Raw Result:`, JSON.stringify(result, null, 2));

    if (result.inside) {
      console.log(`✅ INSIDE zone: ${result.zoneName || 'Unnamed'}`);
    } else {
      console.log(`🚫 OUTSIDE all zones`);
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

async function runTests() {
  console.log(`🚀 Testing StopSuite Zone Validator (Direct)\n`);
  console.log(`ℹ️  Note: StopSuite demo is configured for ATLANTA, not Nashville\n`);

  // Atlanta coordinates (from Vercel logs) - Should be INSIDE zone
  await testCoords('Atlanta (INSIDE Demo Zone)', 33.7591349, -84.36040709999999);

  // Nashville coordinates (from Vercel logs) - Should be OUTSIDE zone
  await testCoords('Nashville (OUTSIDE Demo Zone)', 36.1627, -86.7816);

  console.log('\n✅ Tests complete\n');
}

runTests();

#!/usr/bin/env node
// IMPORTANT: Load dotenv FIRST before importing any modules
import dotenv from 'dotenv';
dotenv.config();

// Now import modules that depend on process.env
import { geocodeAddress } from '../lib/geocode.js';
import { validateDeliveryZone } from '../api/zone-validator.js';

async function testZone(name, address) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 Address: ${address}`);
  console.log('━'.repeat(60));

  try {
    // Geocode the address
    const coords = await geocodeAddress(address);
    console.log(`✅ Coordinates: (${coords.lat}, ${coords.lng})`);

    // Validate the zone
    const result = await validateDeliveryZone(coords.lat, coords.lng);
    console.log(`📊 Zone Result:`, result);

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
  console.log(`🚀 Testing Zone Validator\n`);

  await testZone(
    'Atlanta (Should be INSIDE - StopSuite Demo Zone)',
    '827 Lake Avenue Northeast, Atlanta, GA 30307'
  );

  await testZone(
    'Nashville (Should be OUTSIDE - Not in Demo Zone)',
    '1623 5th Ave N, Nashville, TN 37206'
  );

  console.log('\n✅ Tests complete\n');
}

runTests();

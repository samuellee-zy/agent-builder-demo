/**
 * @file scripts/test_nsw.js
 * @description Verification script for Transport NSW Realtime Trains API.
 * 
 * PURPOSE:
 * - Validates API Key (`TFNSW_API_KEY`).
 * - Fetches `sydneytrains` GTFS-R feed.
 * - Decodes Protobuf response to JSON to ensure `gtfs-realtime-bindings` works.
 */

import fetch from 'node-fetch';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import dotenv from 'dotenv';

dotenv.config();

const TFNSW_API_KEY = process.env.TFNSW_API_KEY;

if (!TFNSW_API_KEY) {
  console.error('Error: TFNSW_API_KEY not found in .env');
  process.exit(1);
}

async function testApi() {
  console.log('Testing NSW Trains API...');
  console.log(`Using Key: ${TFNSW_API_KEY.substring(0, 10)}...`);

  try {
    const response = await fetch('https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains', {
      headers: {
        'Authorization': `apikey ${TFNSW_API_KEY}`,
        'Accept': 'application/x-google-protobuf'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error (${response.status}): ${text}`);
    }

    console.log('API Request Successful!');
    
    const buffer = await response.arrayBuffer();
    console.log(`Received ${buffer.byteLength} bytes.`);

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    console.log('Protobuf Decoding Successful!');
    
    const entityCount = feed.entity.length;
    console.log(`Found ${entityCount} entities in the feed.`);
    
    if (entityCount > 0) {
      const firstEntity = feed.entity[0];
      console.log('Sample Entity:', JSON.stringify(firstEntity, null, 2).substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('Test Failed:', error);
  }
}

testApi();

import fetch from 'node-fetch';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import dotenv from 'dotenv';

dotenv.config();

const TFNSW_API_KEY = process.env.TFNSW_API_KEY;

if (!TFNSW_API_KEY) {
  console.error('Error: TFNSW_API_KEY not found in .env');
  process.exit(1);
}

async function testDataset(dataset) {
  console.log(`\nTesting NSW Transport API (${dataset})...`);
  
  try {
    const response = await fetch(`https://api.transport.nsw.gov.au/v2/gtfs/realtime/${dataset}`, {
      headers: {
        'Authorization': `apikey ${TFNSW_API_KEY}`,
        'Accept': 'application/x-google-protobuf'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error (${response.status}): ${text}`);
    }

    console.log(`[${dataset}] API Request Successful!`);
    
    const buffer = await response.arrayBuffer();
    console.log(`[${dataset}] Received ${buffer.byteLength} bytes.`);

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    console.log(`[${dataset}] Protobuf Decoding Successful!`);
    
    const entityCount = feed.entity.length;
    console.log(`[${dataset}] Found ${entityCount} entities.`);
    
    if (entityCount > 0) {
      const firstEntity = feed.entity[0];
      console.log(`[${dataset}] Sample Entity ID: ${firstEntity.id}`);
    }

  } catch (error) {
    console.error(`[${dataset}] Test Failed:`, error.message);
  }
}

async function runTests() {
  await testDataset('sydneytrains');
  await testDataset('metro');
}

runTests();

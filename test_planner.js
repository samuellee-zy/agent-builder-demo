import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const TFNSW_API_KEY = process.env.TFNSW_API_KEY;
const BASE_URL = 'http://localhost:8080'; // Assuming server is running locally

if (!TFNSW_API_KEY) {
  console.error('Error: TFNSW_API_KEY not found in .env');
  process.exit(1);
}

async function testTripPlanner() {
  console.log('Testing NSW Trip Planner...');

  // 1. Test Stop Finder
  console.log('\n[1] Testing Stop Finder (Central)...');
  const sfParams = new URLSearchParams({
    type_sf: 'any',
    name_sf: 'Central Station',
    TfNSWSF: 'true'
  });

  // We need to hit the actual API or our proxy. 
  // Since this script runs independently, let's hit the proxy if the server is running, 
  // OR hit the API directly to verify the logic if the server isn't running?
  // But the tool uses the proxy. Let's assume the user has the server running or we can hit the API directly for verification.
  // Let's hit the API directly to verify the *logic* of the tool, as we can't easily spin up the server here.
  // Wait, I can use the same logic as the tool but hitting the API directly.

  const apiHeaders = {
    'Authorization': `apikey ${TFNSW_API_KEY}`,
    'Accept': 'application/json'
  };

  const sfUrl = `https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&version=10.2.1.42&${sfParams}`;

  try {
    const sfRes = await fetch(sfUrl, { headers: apiHeaders });
    if (!sfRes.ok) throw new Error(await sfRes.text());
    const sfData = await sfRes.json();
    const originId = sfData.locations?.[0]?.id;
    console.log(`Found Origin ID: ${originId} (${sfData.locations?.[0]?.name})`);

    if (!originId) throw new Error('Origin not found');

    console.log('\n[2] Testing Stop Finder (Manly)...');
    const sfParams2 = new URLSearchParams({
      type_sf: 'any',
      name_sf: 'Manly Wharf',
      TfNSWSF: 'true'
    });
    const sfUrl2 = `https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&version=10.2.1.42&${sfParams2}`;
    const sfRes2 = await fetch(sfUrl2, { headers: apiHeaders });
    const sfData2 = await sfRes2.json();
    const destId = sfData2.locations?.[0]?.id;
    console.log(`Found Destination ID: ${destId} (${sfData2.locations?.[0]?.name})`);

    if (!destId) throw new Error('Destination not found');

    // 3. Test Trip Planner (Ferry Only: Circular Quay -> Manly)
    console.log('\n[3] Testing Trip Planner (Circular Quay -> Manly, Ferry Only)...');

    // Resolve Circular Quay
    const cqParams = new URLSearchParams({ type_sf: 'any', name_sf: 'Circular Quay Wharf 3', TfNSWSF: 'true' });
    const cqRes = await fetch(`https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&version=10.2.1.42&${cqParams}`, { headers: apiHeaders });
    const cqData = await cqRes.json();
    const cqId = cqData.locations?.[0]?.id;
    console.log(`Origin: ${cqId} (${cqData.locations?.[0]?.name})`);

    // Resolve Manly
    const manlyParams = new URLSearchParams({ type_sf: 'any', name_sf: 'Manly Wharf', TfNSWSF: 'true' });
    const manlyRes = await fetch(`https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&version=10.2.1.42&${manlyParams}`, { headers: apiHeaders });
    const manlyData = await manlyRes.json();
    const manlyId = manlyData.locations?.[0]?.id;
    console.log(`Destination: ${manlyId} (${manlyData.locations?.[0]?.name})`);

    const tripParams = new URLSearchParams({
      type_origin: 'any',
      name_origin: cqId,
      type_destination: 'any',
      name_destination: manlyId,
      calcNumberOfTrips: '3',
      depArrMacro: 'dep',
      itdDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      itdTime: new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', ''),
      TfNSWTR: 'true',
      excludedMeans: 'checkbox'
    });

    // Exclude everything except Ferry (9)
    const modeMap = { '1': 'Train', '2': 'Metro', '4': 'LightRail', '5': 'Bus', '7': 'Coach', '11': 'SchoolBus' };
    Object.keys(modeMap).forEach(id => tripParams.append(`exclMOT_${id}`, '1'));

    const tripUrl = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&version=10.2.1.42&${tripParams}`;

    const tripRes = await fetch(tripUrl, { headers: apiHeaders });
    if (!tripRes.ok) throw new Error(await tripRes.text());
    const tripData = await tripRes.json();

    console.log(`Found ${tripData.journeys?.length || 0} journeys.`);

    if (tripData.journeys?.length > 0) {
      const leg = tripData.journeys[0].legs[0];
      console.log(`Sample Leg: ${leg.transportation?.product?.name || leg.transportation?.name} from ${leg.origin?.name}`);
    } else {
      console.log('No journeys found. (Might be too late for ferries?)');
    }

  } catch (e) {
    console.error('Test Failed:', e);
  }
}

testTripPlanner();

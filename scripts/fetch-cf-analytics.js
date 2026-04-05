#!/usr/bin/env node
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!ZONE_ID || !API_TOKEN || !ACCOUNT_ID) {
  throw new Error('Missing required env vars: CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID');
}

async function fetchAnalytics() {
  // Get last 90 days
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateTo = now.toISOString().split('T')[0];

  const query = `
    query {
      viewer {
        zones(filter: {zoneTag: "${ZONE_ID}"}) {
          httpRequests1dGroups(limit: 10000, filter: {date_geq: "${dateFrom}", date_leq: "${dateTo}"}, orderBy: [sum_requests_DESC]) {
            dimensions {
              date
            }
            sum {
              requests
              bytes
              cachedBytes
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GraphQL error: ${response.status} ${error}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  const groups = data.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  
  if (!groups.length) {
    console.log('No analytics data found');
    return;
  }

  // Convert to CSV format
  const csvData = groups.map(g => ({
    date: g.dimensions.date,
    requests: g.sum.requests,
    bytes: g.sum.bytes,
    cached_bytes: g.sum.cachedBytes,
  }));

  const csv = stringify(csvData, {
    header: true,
    columns: ['date', 'requests', 'bytes', 'cached_bytes'],
  });

  // Save to analytics directory
  const analyticsDir = path.join(__dirname, '..', 'analytics');
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const filename = path.join(analyticsDir, `analytics-${dateTo}.csv`);
  fs.writeFileSync(filename, csv);
  
  console.log(`✓ Analytics saved to ${filename}`);
  console.log(`  ${groups.length} days of data`);
}

fetchAnalytics().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

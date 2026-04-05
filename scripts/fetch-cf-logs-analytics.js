#!/usr/bin/env node
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
  throw new Error('Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN');
}

async function fetchLogsAnalytics() {
  // Get last 30 days
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const endTime = Math.floor(now.getTime() / 1000);
  const startTime = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);

  // Query Analytics Engine dataset via GraphQL
  const query = `
    query {
      viewer {
        accounts(filter: {accountTag: "${ACCOUNT_ID}"}) {
          analyticEngineDataset {
            data(
              filter: {
                and: [
                  {gt: [{field: "timestamp", value: "${startTime}"}]}
                  {lt: [{field: "timestamp", value: "${endTime}"}]}
                ]
              }
              orderBy: [sum_count_DESC]
              limit: 1000
            ) {
              sum {
                _count: doubles
              }
              dimensions {
                _indexes: indexes
              }
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

  const results = data.data?.viewer?.accounts?.[0]?.analyticEngineDataset?.data || [];
  
  if (!results.length) {
    console.log('No analytics data found');
    return;
  }

  // Convert to CSV format
  const csvData = results.map(r => {
    const indexes = r.dimensions._indexes || [];
    const dims = indexes[0] || 'Unknown|Unknown|Unknown';
    const [country, clientType, deviceType] = dims.split('|');
    return {
      country,
      clientType,
      deviceType,
      requests: Math.round(r.sum._count?.[0] || 0),
    };
  });

  const csv = stringify(csvData, {
    header: true,
    columns: ['country', 'clientType', 'deviceType', 'requests'],
  });

  // Save to analytics directory
  const analyticsDir = path.join(__dirname, '..', 'analytics');
  if (!fs.existsSync(analyticsDir)) {
    fs.mkdirSync(analyticsDir, { recursive: true });
  }

  const filename = path.join(analyticsDir, `analytics-logs-${dateStr}.csv`);
  fs.writeFileSync(filename, csv);
  
  console.log(`✓ Logs analytics saved to ${filename}`);
  console.log(`  ${csvData.length} countries, ${csvData.reduce((sum, r) => sum + r.requests, 0)} total requests`);
}

fetchLogsAnalytics().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

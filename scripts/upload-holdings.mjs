import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure environment variables exist
if (!process.env.EDGE_CONFIG_ID || !process.env.VERCEL_ACCESS_TOKEN) {
  console.error('Error: EDGE_CONFIG_ID or VERCEL_ACCESS_TOKEN is not set in .env.local');
  process.exit(1);
}

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_ACCESS_TOKEN = process.env.VERCEL_ACCESS_TOKEN;

// Read and parse CSV
const csvPath = join(__dirname, '..', 'src', 'data', 'holdings.csv');
console.log('Reading CSV from:', csvPath);

try {
  const csvFile = readFileSync(csvPath, 'utf8');
  const { data } = Papa.parse(csvFile, { 
    header: true, 
    dynamicTyping: true,
    skipEmptyLines: true 
  });

  if (!data || data.length === 0) {
    throw new Error('No data found in CSV file');
  }

  console.log(`Found ${data.length} holdings in CSV`);

  // Convert to Edge Config format
  const holdings = {};
  for (const holding of data) {
    if (!holding.ticker || !holding.averagePrice || !holding.quantity) {
      console.warn(`Skipping invalid holding:`, holding);
      continue;
    }
    holdings[holding.ticker] = {
      averagePrice: Number(holding.averagePrice),
      quantity: Number(holding.quantity)
    };
  }

  if (Object.keys(holdings).length === 0) {
    throw new Error('No valid holdings data found');
  }

  // Upload to Edge Config via API
  async function uploadHoldings() {
    try {
      console.log('Uploading holdings to Edge Config...');
  
      const response = await fetch(`https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VERCEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              key: 'holdings',
              value: holdings,
              operation: 'upsert'  // Using upsert to create or update
            }
          ]
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || await response.text();
        throw new Error(`Failed to upload: ${response.status} - ${errorMessage}`);
      }
  
      console.log('✅ Successfully uploaded holdings to Edge Config');
      console.log(`Uploaded ${Object.keys(holdings).length} holdings`);
    } catch (error) {
      console.error('❌ Error uploading to Edge Config:', error);
      process.exit(1);
    }
  }

  uploadHoldings();
} catch (error) {
  console.error('❌ Error processing holdings:', error);
  process.exit(1);
}
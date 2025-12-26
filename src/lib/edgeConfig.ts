import invariant from '../utils/invariant';

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const EDGE_CONFIG_TOKEN = process.env.VERCEL_ACCESS_TOKEN;

invariant(EDGE_CONFIG_ID, 'EDGE_CONFIG_ID is not configured.');
invariant(EDGE_CONFIG_TOKEN, 'VERCEL_ACCESS_TOKEN is required to manage Edge Config.');

const BASE_URL = `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}`;

type EdgeConfigItem = {
  key: string;
  value: any;
};

type EdgeConfigItemsResponse =
  | {
      items: EdgeConfigItem[];
    }
  | EdgeConfigItem[];

function extractItems(response: EdgeConfigItemsResponse): EdgeConfigItem[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
}

async function fetchAllItems(): Promise<EdgeConfigItem[]> {
  const response = await fetch(`${BASE_URL}/items`, {
    headers: {
      Authorization: `Bearer ${EDGE_CONFIG_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Edge Config request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EdgeConfigItemsResponse;
  return extractItems(data);
}

export async function getEdgeConfigValue<T>(key: string): Promise<T | null> {
  const items = await fetchAllItems();
  const entry = items.find((item) => item.key === key);
  return entry ? (entry.value as T) : null;
}

export async function upsertEdgeConfigValue(key: string, value: unknown) {
  const response = await fetch(`${BASE_URL}/items`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${EDGE_CONFIG_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          key,
          value,
          operation: 'upsert',
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update Edge Config: ${response.status} ${errorBody}`);
  }
}

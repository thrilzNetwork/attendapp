const UBER_AUTH_URL = 'https://auth.uber.com/oauth/v2/token';
const UBER_API_BASE = 'https://api.uber.com/v1';

const CLIENT_ID = process.env.UBER_DIRECT_CLIENT_ID!;
const CLIENT_SECRET = process.env.UBER_DIRECT_CLIENT_SECRET!;
const CUSTOMER_ID = process.env.UBER_DIRECT_CUSTOMER_ID!;

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getUberToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(UBER_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    }),
  });
  if (!res.ok) throw new Error(`Uber auth failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export interface UberDeliveryRequest {
  pickupAddress: string;
  pickupName: string;
  pickupPhone: string;
  dropoffAddress: string;
  dropoffName: string;
  dropoffPhone: string;
  dropoffNotes?: string;
  items?: { name: string; quantity: number; price: number }[];
  externalId?: string;
}

export async function createUberDelivery(req: UberDeliveryRequest) {
  const token = await getUberToken();
  const body = {
    pickup_address: JSON.stringify({ street_address: [req.pickupAddress] }),
    pickup_name: req.pickupName,
    pickup_phone_number: req.pickupPhone,
    dropoff_address: JSON.stringify({ street_address: [req.dropoffAddress] }),
    dropoff_name: req.dropoffName,
    dropoff_phone_number: req.dropoffPhone,
    dropoff_notes: req.dropoffNotes || '',
    manifest_items: (req.items || []).map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: Math.round(i.price * 100),
      dimensions: { length: 10, height: 10, depth: 10, weight: 200 },
    })),
    external_id: req.externalId || '',
  };

  const res = await fetch(`${UBER_API_BASE}/customers/${CUSTOMER_ID}/deliveries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

export async function getUberDelivery(deliveryId: string) {
  const token = await getUberToken();
  const res = await fetch(`${UBER_API_BASE}/customers/${CUSTOMER_ID}/deliveries/${deliveryId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Uber delivery fetch failed: ${await res.text()}`);
  return res.json();
}

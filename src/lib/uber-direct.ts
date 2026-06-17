const BASE = `https://api.uber.com/v1/customers/${process.env.UBER_DIRECT_CUSTOMER_ID}`;

let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const res = await fetch('https://login.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.UBER_DIRECT_CLIENT_ID!,
      client_secret: process.env.UBER_DIRECT_CLIENT_SECRET!,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Uber auth failed: ${JSON.stringify(data)}`);
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

export interface UberQuote {
  id: string;
  fee_cents: number;
  fee_display: string;
  eta_minutes: number;
  expires: string;
}

export interface UberDelivery {
  id: string;
  tracking_url: string;
  status: string;
}

export interface UberLocation {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  phone_number?: string;
  notes?: string;
}

export async function getDeliveryQuote(params: {
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
}): Promise<UberQuote> {
  const token = await getToken();
  const body: Record<string, unknown> = {
    pickup_address: params.pickup_address,
    dropoff_address: params.dropoff_address,
  };
  if (params.pickup_lat) body.pickup_latitude = params.pickup_lat;
  if (params.pickup_lng) body.pickup_longitude = params.pickup_lng;
  if (params.dropoff_lat) body.dropoff_latitude = params.dropoff_lat;
  if (params.dropoff_lng) body.dropoff_longitude = params.dropoff_lng;

  const res = await fetch(`${BASE}/delivery_quotes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Uber quote error: ${JSON.stringify(data)}`);

  const feeCents = data.fee ?? 0;
  return {
    id: data.id,
    fee_cents: feeCents,
    fee_display: `$${(feeCents / 100).toFixed(2)}`,
    eta_minutes: Math.ceil((data.duration ?? 1800) / 60),
    expires: data.expires ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export async function createDelivery(params: {
  quote_id: string;
  pickup: UberLocation;
  dropoff: UberLocation;
  manifest_items: { name: string; quantity: number; price: number }[];
  external_store_id: string;
}): Promise<UberDelivery> {
  const token = await getToken();
  const res = await fetch(`${BASE}/deliveries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quote_id: params.quote_id,
      pickup_name: params.pickup.name,
      pickup_address: params.pickup.address,
      pickup_phone_number: params.pickup.phone_number ?? '+13055550000',
      pickup_notes: params.pickup.notes ?? '',
      dropoff_name: params.dropoff.name,
      dropoff_address: params.dropoff.address,
      dropoff_phone_number: params.dropoff.phone_number ?? '+13055550000',
      dropoff_notes: params.dropoff.notes ?? 'Hotel guest delivery',
      manifest_items: params.manifest_items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price * 100,
      })),
      external_store_id: params.external_store_id,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Uber delivery error: ${JSON.stringify(data)}`);
  return { id: data.id, tracking_url: data.tracking_url, status: data.status };
}

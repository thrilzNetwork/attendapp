const CLOVER_BASE = 'https://api.clover.com/v3';

export interface CloverItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: boolean;
}

export interface CloverOrder {
  id: string;
  state: string;
  total: number;
  createdTime: number;
}

export async function getCloverMenu(merchantId: string, accessToken: string): Promise<CloverItem[]> {
  const res = await fetch(`${CLOVER_BASE}/merchants/${merchantId}/items?expand=categories&filter=available=true`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Clover menu fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.elements || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    name: item.name as string,
    description: (item.description as string) || '',
    price: (item.price as number) || 0,
    available: (item.available as boolean) ?? true,
  }));
}

export async function createCloverOrder(
  merchantId: string,
  accessToken: string,
  items: Array<{ itemId: string; name: string; qty: number; price: number }>,
  roomInfo: { name: string; room: string },
): Promise<CloverOrder> {
  const lineItems = items.map(item => ({
    item: { id: item.itemId },
    name: item.name,
    unitQty: item.qty * 1000,
    price: Math.round(item.price * 100),
  }));

  const res = await fetch(`${CLOVER_BASE}/merchants/${merchantId}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: 'open',
      lineItems,
      note: `Attenda Room Order — ${roomInfo.name} / Room ${roomInfo.room}`,
    }),
  });
  if (!res.ok) throw new Error(`Clover order creation failed: ${res.status}`);
  return res.json();
}

export async function requestDelivery(
  merchantId: string,
  accessToken: string,
  orderId: string,
  deliveryAddress: string,
): Promise<void> {
  const res = await fetch(`https://api.orderout.co/v1/delivery`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      deliveryAddress,
      pos: 'clover',
      merchantId,
    }),
  });
  if (!res.ok) throw new Error(`Delivery request failed: ${res.status}`);
}

export async function refreshCloverToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`https://api.clover.com/oauth/v2/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_CLOVER_CLIENT_ID,
      client_secret: process.env.CLOVER_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Clover token refresh failed');
  const data = await res.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

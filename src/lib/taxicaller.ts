/**
 * TaxiCaller API client.
 * All external calls are isolated here — update endpoints/auth once credentials arrive
 * without touching any other file.
 */

const TC_BASE = process.env.TAXICALLER_API_BASE ?? 'https://api.taxicaller.net/v1';
const TC_API_KEY = process.env.TAXICALLER_API_KEY ?? '';

function tcHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TC_API_KEY}`,
  };
}

export interface TaxiCallerQuoteParams {
  pickup: string;          // address string
  destination: string;
  pax: number;
  pickupTime: string;      // ISO datetime
}

export interface TaxiCallerQuoteResult {
  quoteId: string;
  base_fare_cents: number;
  currency: string;
  estimated_mins: number;
  vehicle_type: string;
}

export interface TaxiCallerBookingParams {
  quoteId: string;
  guestName: string;
  guestPhone?: string;
  pickup: string;
  destination: string;
  pickupTime: string;
  pax: number;
  notes?: string;
}

export interface TaxiCallerBookingResult {
  booking_id: string;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  tracking_url: string;
}

export async function getTaxiCallerQuote(params: TaxiCallerQuoteParams): Promise<TaxiCallerQuoteResult> {
  if (!TC_API_KEY) {
    // Sandbox fallback — returns a mock quote when no API key is configured
    return {
      quoteId: `mock_${Date.now()}`,
      base_fare_cents: 2500,
      currency: 'usd',
      estimated_mins: 20,
      vehicle_type: 'sedan',
    };
  }

  const res = await fetch(`${TC_BASE}/quote`, {
    method: 'POST',
    headers: tcHeaders(),
    body: JSON.stringify({
      pickup_address: params.pickup,
      dropoff_address: params.destination,
      passengers: params.pax,
      pickup_time: params.pickupTime,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TaxiCaller quote error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    quoteId: data.quote_id ?? data.id,
    base_fare_cents: Math.round((data.estimated_fare ?? data.base_fare ?? 0) * 100),
    currency: data.currency ?? 'usd',
    estimated_mins: data.estimated_duration_minutes ?? data.eta_minutes ?? 0,
    vehicle_type: data.vehicle_type ?? 'sedan',
  };
}

export async function createTaxiCallerBooking(params: TaxiCallerBookingParams): Promise<TaxiCallerBookingResult> {
  if (!TC_API_KEY) {
    // Sandbox fallback — returns mock booking details
    return {
      booking_id: `mock_booking_${Date.now()}`,
      driver_name: 'Demo Driver',
      driver_phone: '+1 (555) 000-0000',
      vehicle_plate: 'DEMO-123',
      tracking_url: 'https://taxicaller.com/track/demo',
    };
  }

  const res = await fetch(`${TC_BASE}/booking`, {
    method: 'POST',
    headers: tcHeaders(),
    body: JSON.stringify({
      quote_id: params.quoteId,
      passenger_name: params.guestName,
      passenger_phone: params.guestPhone ?? '',
      pickup_address: params.pickup,
      dropoff_address: params.destination,
      pickup_time: params.pickupTime,
      passengers: params.pax,
      notes: params.notes ?? '',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TaxiCaller booking error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    booking_id: data.booking_id ?? data.id,
    driver_name: data.driver?.name ?? '',
    driver_phone: data.driver?.phone ?? '',
    vehicle_plate: data.vehicle?.plate ?? '',
    tracking_url: data.tracking_url ?? '',
  };
}

export async function cancelTaxiCallerBooking(bookingId: string): Promise<void> {
  if (!TC_API_KEY) return;

  const res = await fetch(`${TC_BASE}/booking/${bookingId}`, {
    method: 'DELETE',
    headers: tcHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TaxiCaller cancel error ${res.status}: ${text}`);
  }
}

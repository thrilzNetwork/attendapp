import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW1zdGF0cnNlbmlkbGdqb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE5MjAsImV4cCI6MjA5NDE4NzkyMH0.1pnioO5Y_3pW2LTaYc9aliRwTkGhX2cTNLrK9jI1P-4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };

// Types
export interface ReviewLink {
  label: string;
  url: string;
}

export interface HotelConfig {
  id?: string;
  slug: string;
  name: string;
  address: string;
  wifiName: string;
  wifiPassword: string;
  welcomeLetter: string;
  managerName: string;
  teamPhotoUrl: string;
  frontDeskPhone: string;
  googleSheetUrl: string;
  notificationEmail: string;
  appsScriptUrl: string;
  serviceAccountEmail: string;
  websiteUrl: string;
  adminPhone: string;
  roomCount: number;
  googleReviewUrl: string;
  tripadvisorUrl: string;
  yelpUrl: string;
  brandColor: string;
  customReviewLinks: ReviewLink[];
  propertyType: string;
  gmNotes: string;
  // Free shuttle config
  hasFreeShuttle?: boolean;
  shuttleStartTime?: string;
  shuttleEndTime?: string;
  shuttleDays?: number[];
  shuttleCapacity?: number;
  shuttlePickupLocation?: string;
  shuttleNotes?: string;
  weekStartsOn?: 'Sunday' | 'Monday';
}

export interface StaffAccount {
  id?: string;
  hotel_id?: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  pin_code: string;
  active: boolean;
  department?: string;
  permissions?: string[]; // ['orders', 'messages', 'shuttle', 'hotel', 'staff_mgmt', 'partners', 'qrcodes']
  vendor_type?: string;   // 'shuttle' | 'taxi' | etc — only relevant when role='vendor'
}

export interface RequestItem {
  id: string;
  guestName: string;
  room: string;
  type: string;
  details: string;
  status: string;
  createdAt: string;
}

// Hotel Config helpers
export async function getHotelConfig(slug?: string): Promise<HotelConfig | null> {
  const hotelSlug = slug
    || (typeof window !== 'undefined' ? localStorage.getItem('attenda_hotel_slug') : null)
    || 'miami-airport';
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('slug', hotelSlug)
    .single();
  if (error) { /* hotel config not found — common before slug is stored */ return null; }
  return {
    id: data.id,
    slug: data.slug,
    name: data.name || '',
    address: data.address || '',
    wifiName: data.wifi_name || '',
    wifiPassword: data.wifi_password || '',
    welcomeLetter: data.welcome_letter || '',
    managerName: data.manager_name || '',
    teamPhotoUrl: data.team_photo_url || '',
    frontDeskPhone: data.front_desk_phone || '',
    googleSheetUrl: data.google_sheet_url || '',
    notificationEmail: data.notification_email || '',
    appsScriptUrl: data.apps_script_url || '',
    serviceAccountEmail: data.service_account_email || '',
    websiteUrl: data.website_url || '',
    adminPhone: data.admin_phone || '',
    roomCount: data.room_count || 0,
    googleReviewUrl: data.google_review_url || '',
    tripadvisorUrl: data.tripadvisor_url || '',
    yelpUrl: data.yelp_url || '',
    brandColor: data.brand_color || '#6B1D3C',
    customReviewLinks: data.custom_review_links || [],
    propertyType: data.brand || 'Hotel',
    gmNotes: data.gm_notes || '',
    hasFreeShuttle: data.has_free_shuttle ?? false,
    shuttleStartTime: data.shuttle_start_time || '',
    shuttleEndTime: data.shuttle_end_time || '',
    shuttleDays: data.shuttle_days || [1,2,3,4,5,6,7],
    shuttleCapacity: data.shuttle_capacity || 8,
    shuttlePickupLocation: data.shuttle_pickup_location || '',
    shuttleNotes: data.shuttle_notes || '',
    weekStartsOn: data.week_starts_on || 'Sunday',
  };
}

export async function updateHotelConfig(config: Partial<HotelConfig>) {
  const { data, error } = await supabase
    .from('hotels')
    .upsert({
      slug: config.slug || 'miami-airport',
      name: config.name,
      address: config.address,
      wifi_name: config.wifiName,
      wifi_password: config.wifiPassword,
      welcome_letter: config.welcomeLetter,
      manager_name: config.managerName,
      team_photo_url: config.teamPhotoUrl,
      front_desk_phone: config.frontDeskPhone,
      google_sheet_url: config.googleSheetUrl,
      notification_email: config.notificationEmail,
      apps_script_url: config.appsScriptUrl,
      service_account_email: config.serviceAccountEmail,
      website_url: config.websiteUrl,
      admin_phone: config.adminPhone,
      room_count: config.roomCount,
      google_review_url: config.googleReviewUrl,
      tripadvisor_url: config.tripadvisorUrl,
      yelp_url: config.yelpUrl,
      brand_color: config.brandColor,
      custom_review_links: config.customReviewLinks,
      brand: config.propertyType || 'Hotel',
      gm_notes: config.gmNotes || '',
      week_starts_on: config.weekStartsOn || 'Sunday',
    }, { onConflict: 'slug' });
  if (error) throw error;
  return data;
}

// Request helpers
export async function getAllRequests(hotelId?: string): Promise<RequestItem[]> {
  let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
  if (hotelId) {
    query = query.eq('hotel_id', hotelId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    guestName: r.guest_name as string,
    room: r.room as string,
    type: r.type as string,
    details: r.details as string,
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
}

export async function getMessages(hotelId: string, guestName: string, room: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('guest_name', guestName)
    .eq('room', room)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    hotel_id: m.hotel_id as string,
    guest_name: m.guest_name as string,
    room: m.room as string,
    sender: m.sender as 'guest' | 'staff' | 'bot',
    body: m.body as string,
    created_at: m.created_at as string,
  }));
}

export type ChatMessage = {
  id: string;
  hotel_id: string;
  guest_name: string;
  room: string;
  sender: 'guest' | 'staff' | 'bot';
  body: string;
  created_at: string;
};

export async function insertRequest(req: { guestName: string; room: string; type: string; details: string; hotelId?: string }) {
  const hid = req.hotelId || (await getHotelConfig())?.id;
  const { data, error } = await supabase.from('requests').insert({
    hotel_id: hid,
    guest_name: req.guestName,
    room: req.room,
    type: req.type,
    details: req.details,
    status: 'pending',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRequestStatus(id: string, status: string) {
  const { error } = await supabase.from('requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteRequest(id: string) {
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) throw error;
}

// Staff account helpers
export async function getStaffAccounts(hotelId?: string): Promise<StaffAccount[]> {
  let query = supabase.from('staff_accounts').select('*');
  if (hotelId) {
    query = query.eq('hotel_id', hotelId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.name as string,
    role: s.role as string,
    pin_code: s.pin_code as string,
    active: s.active as boolean,
  }));
}

export async function createStaffAccount(staff: Partial<StaffAccount>) {
  const { data, error } = await supabase.from('staff_accounts').insert({
    name: staff.name,
    role: staff.role || 'staff',
    pin_code: staff.pin_code,
    active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStaffAccount(id: string) {
  const { error } = await supabase.from('staff_accounts').delete().eq('id', id);
  if (error) throw error;
}

// Real-time subscription helper
export function subscribeToRequests(hotelId: string | null, callback: (payload: Record<string, unknown>) => void) {
  const channel = supabase
    .channel('requests-changes');
  if (hotelId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any).on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `hotel_id=eq.${hotelId}` }, (payload: Record<string, unknown>) => {
      callback(payload);
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any).on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload: Record<string, unknown>) => {
      callback(payload);
    });
  }
  channel.subscribe();
  return channel;
}

export function subscribeToMessages(hotelId: string | null, callback: () => void) {
  const channel = supabase
    .channel('messages-live');
  if (hotelId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `hotel_id=eq.${hotelId}` }, callback);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (channel as any).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, callback);
  }
  channel.subscribe();
  return channel;
}

// ─── Partners ────────────────────────────────────────────────

export interface Partner {
  id: string;
  hotel_id: string;
  name: string;
  category: string; // 'restaurant' | 'attraction' | 'service'
  description: string;
  image_url: string;
  phone: string;
  address: string;
  hours: string;
  distance: string;
  rating: number;
  has_ordering: boolean;
  is_active: boolean;
  email: string;
  clover_merchant_id?: string;
  clover_access_token?: string;
  clover_refresh_token?: string;
  clover_token_expires_at?: string;
  clover_enabled?: boolean;
  google_place_id?: string;
  delivery_providers?: { name: string; url: string }[];
  attenda_fee_percent?: number;
  hotel_revenue_share_percent?: number;
}

export interface PartnerMenuItem {
  id: string;
  partner_id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
}

export async function getPartners(hotelId: string): Promise<Partner[]> {
  const { data } = await supabase
    .from('partners').select('*')
    .eq('hotel_id', hotelId).eq('is_active', true)
    .order('category').order('name');
  return data || [];
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const { data } = await supabase.from('partners').select('*').eq('id', id).single();
  return data || null;
}

export async function createPartner(partner: Omit<Partner, 'id' | 'is_active'>): Promise<Partner | null> {
  const { data } = await supabase.from('partners').insert({ ...partner, is_active: true }).select().single();
  return data;
}

export async function updatePartner(id: string, updates: Partial<Partner>): Promise<void> {
  await supabase.from('partners').update(updates).eq('id', id);
}

export async function deletePartner(id: string): Promise<void> {
  await supabase.from('partners').delete().eq('id', id);
}

export async function getPartnerMenuItems(partnerId: string): Promise<PartnerMenuItem[]> {
  const { data } = await supabase.from('partner_menu_items').select('*')
    .eq('partner_id', partnerId).eq('is_active', true);
  return data || [];
}

export async function createPartnerMenuItem(item: { partner_id: string; name: string; description: string; price: number }): Promise<void> {
  await supabase.from('partner_menu_items').insert({ ...item, is_active: true });
}

export async function deletePartnerMenuItem(id: string): Promise<void> {
  await supabase.from('partner_menu_items').delete().eq('id', id);
}

// ─── Hotels (multi-tenant) ────────────────────────────────────

export async function getAllHotels() {
  const { data } = await supabase.from('hotels').select('*').order('created_at');
  return data || [];
}

export async function createHotel(data: {
  slug: string;
  name: string;
  websiteUrl?: string;
  adminPhone?: string;
  roomCount?: number;
  address?: string;
  adminEmail?: string;
  notificationEmail?: string;
  googleReviewUrl?: string;
  tripadvisorUrl?: string;
  yelpUrl?: string;
  propertyType?: string;
}) {
  const { data: hotel, error } = await supabase.from('hotels').insert({
    slug: data.slug,
    name: data.name,
    website_url: data.websiteUrl || null,
    admin_phone: data.adminPhone || null,
    room_count: data.roomCount || 0,
    address: data.address || null,
    notification_email: data.adminEmail || data.notificationEmail || null,
    google_review_url: data.googleReviewUrl || null,
    tripadvisor_url: data.tripadvisorUrl || null,
    yelp_url: data.yelpUrl || null,
    brand: data.propertyType || 'Hotel',
  }).select().single();
  if (error) throw error;
  return hotel;
}

export async function deleteHotel(id: string) {
  // Cascade delete all related data
  const { data: partners } = await supabase.from('partners').select('id').eq('hotel_id', id);
  if (partners?.length) {
    await supabase.from('partner_menu_items').delete().in('partner_id', partners.map(p => p.id));
    await supabase.from('partners').delete().eq('hotel_id', id);
  }
  await supabase.from('qr_codes').delete().eq('hotel_id', id);
  await supabase.from('requests').delete().eq('hotel_id', id);
  await supabase.from('messages').delete().eq('hotel_id', id);
  await supabase.from('staff_accounts').delete().eq('hotel_id', id);
  await supabase.from('attenda_fees').delete().eq('hotel_id', id);
  await supabase.from('hotels').delete().eq('id', id);
}

export async function toggleHotelActive(hotelId: string, active: boolean) {
  await supabase.from('hotels').update({ is_active: active }).eq('id', hotelId);
}

export async function toggleCloverForPartner(partnerId: string, enabled: boolean) {
  await supabase.from('partners').update({ clover_enabled: enabled }).eq('id', partnerId);
}

export async function togglePartnerOrdering(partnerId: string, enabled: boolean) {
  await supabase.from('partners').update({ has_ordering: enabled }).eq('id', partnerId);
}

// ─── QR Codes ─────────────────────────────────────────────────

export interface QrCode {
  id: string;
  hotel_id: string;
  label: string;
  location_type: string;
  url: string;
  created_at: string;
}

export async function getQrCodes(hotelId: string): Promise<QrCode[]> {
  const { data } = await supabase.from('qr_codes').select('*')
    .eq('hotel_id', hotelId).order('created_at', { ascending: false });
  return data || [];
}

export async function createQrCode(hotelId: string, label: string, locationType: string, url: string): Promise<void> {
  await supabase.from('qr_codes').insert({ hotel_id: hotelId, label, location_type: locationType, url });
}

export async function deleteQrCode(id: string): Promise<void> {
  await supabase.from('qr_codes').delete().eq('id', id);
}

// ─── Shuttle Types ──────────────────────────────────────────

export interface ShuttleRoute {
  id: string;
  hotel_id: string;
  name: string;
  type: 'airport' | 'cruise' | 'custom';
  active: boolean;
  price: number;       // 0 = free
  currency: string;    // default "USD"
}

export interface ShuttleSlot {
  id: string;
  route_id: string;
  departure_time: string;
  days_of_week: number[];
  date: string | null;
  capacity: number;
  active: boolean;
  event_label: string;     // e.g. "Royal Caribbean · May 17"
  override_price: number | null;  // overrides route.price if set
  route_name?: string;
  route_type?: string;
  route_price?: number;
  route_currency?: string;
  bookings_count?: number;
}

export interface ShuttleBooking {
  id: string;
  slot_id: string;
  guest_name: string;
  room_number: string;
  pax: number;
  notes: string;
  status: 'confirmed' | 'cancelled' | 'no_show';
  price_charged: number;
  charge_accepted: boolean;
  created_at: string;
  slot_time?: string;
  route_name?: string;
}

export interface ShuttleRequest {
  id: string;
  hotel_id: string;
  guest_name: string;
  room_number: string;
  pickup_location: string;
  destination: string;
  date: string | null;
  time: string | null;
  pax: number;
  notes: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assigned_driver_id: string | null;
  assigned_driver_name?: string;
  created_at: string;
}

// ─── Shuttle CRUD ───────────────────────────────────────────

export async function getShuttleRoutes(hotelId: string): Promise<ShuttleRoute[]> {
  const { data } = await supabase.from('shuttle_routes').select('*')
    .eq('hotel_id', hotelId).eq('active', true).order('name');
  return data || [];
}

export async function createShuttleRoute(route: { hotel_id: string; name: string; type: string; price?: number }) {
  const { data } = await supabase.from('shuttle_routes').insert({ ...route, price: route.price || 0 }).select().single();
  return data;
}

export async function deleteShuttleRoute(id: string) {
  await supabase.from('shuttle_routes').delete().eq('id', id);
}

export async function toggleShuttleRoute(id: string, active: boolean) {
  await supabase.from('shuttle_routes').update({ active }).eq('id', id);
}

export async function getShuttleSlots(routeId: string): Promise<ShuttleSlot[]> {
  const { data } = await supabase.from('shuttle_slots').select(`
    *, shuttle_routes!inner(name, type)
  `).eq('route_id', routeId).eq('active', true).order('departure_time');
    return (data || []).map((s: Record<string, unknown>) => ({
    ...s,
    route_name: (s.shuttle_routes as Record<string, unknown>)?.name as string,
    route_type: (s.shuttle_routes as Record<string, unknown>)?.type as string,
    route_price: ((s.shuttle_routes as Record<string, unknown>)?.price as number) || 0,
    route_currency: ((s.shuttle_routes as Record<string, unknown>)?.currency as string) || 'USD',
  })) as ShuttleSlot[];
}

export async function getAllShuttleSlotsForHotel(hotelId: string): Promise<ShuttleSlot[]> {
  const { data } = await supabase.from('shuttle_slots').select(`
    *, shuttle_routes!inner(name, type)
  `).eq('shuttle_routes.hotel_id', hotelId).eq('shuttle_routes.active', true).eq('shuttle_slots.active', true).order('departure_time');
  // Attach booking counts
  const slotIds = (data || []).map((s: Record<string, unknown>) => s.id as string);
  if (slotIds.length > 0) {
    const { data: counts } = await supabase.from('shuttle_bookings')
      .select('slot_id, count()', { count: 'exact' })
      .in('slot_id', slotIds).eq('status', 'confirmed');
    const countMap: Record<string, number> = {};
    ((counts || []) as { slot_id: string; count: number }[]).forEach(c => { countMap[c.slot_id] = c.count; });
    return (data || []).map((s: Record<string, unknown>) => ({
      ...s,
      route_name: (s.shuttle_routes as Record<string, unknown>)?.name as string,
      route_type: (s.shuttle_routes as Record<string, unknown>)?.type as string,
      route_price: ((s.shuttle_routes as Record<string, unknown>)?.price as number) || 0,
      route_currency: ((s.shuttle_routes as Record<string, unknown>)?.currency as string) || 'USD',
      bookings_count: countMap[s.id as string] || 0,
    })) as ShuttleSlot[];
  }
  return (data || []).map((s: Record<string, unknown>) => ({
    ...s,
    route_name: (s.shuttle_routes as Record<string, unknown>)?.name as string,
    route_type: (s.shuttle_routes as Record<string, unknown>)?.type as string,
    route_price: ((s.shuttle_routes as Record<string, unknown>)?.price as number) || 0,
    route_currency: ((s.shuttle_routes as Record<string, unknown>)?.currency as string) || 'USD',
    bookings_count: 0,
  })) as ShuttleSlot[];
}

export async function createShuttleSlot(slot: {
  route_id: string; departure_time: string;
  days_of_week?: number[]; date?: string; capacity?: number;
  event_label?: string; override_price?: number;
}) {
  const { data } = await supabase.from('shuttle_slots').insert({
    ...slot, days_of_week: slot.days_of_week || [], capacity: slot.capacity || 0,
    event_label: slot.event_label || '', override_price: slot.override_price ?? null,
  }).select().single();
  return data;
}

export async function deleteShuttleSlot(id: string) {
  await supabase.from('shuttle_slots').delete().eq('id', id);
}

export async function getShuttleBookings(slotId: string): Promise<ShuttleBooking[]> {
  const { data } = await supabase.from('shuttle_bookings').select(`
    *, shuttle_slots!inner(departure_time, shuttle_routes!inner(name))
  `).eq('slot_id', slotId).eq('status', 'confirmed').order('created_at', { ascending: false });
  return (data || []).map((b: Record<string, unknown>) => ({
    ...b,
    slot_time: (b.shuttle_slots as Record<string, unknown>)?.departure_time as string,
    route_name: ((b.shuttle_slots as Record<string, unknown>)?.shuttle_routes as Record<string, unknown>)?.name as string,
  })) as ShuttleBooking[];
}

export async function getAllShuttleBookingsForHotel(hotelId: string): Promise<ShuttleBooking[]> {
  const { data } = await supabase.from('shuttle_bookings').select(`
    *, shuttle_slots!inner(departure_time, shuttle_routes!inner(name, hotel_id))
  `).eq('shuttle_slots.shuttle_routes.hotel_id', hotelId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false });
  return (data || []).map((b: Record<string, unknown>) => ({
    ...b,
    slot_time: (b.shuttle_slots as Record<string, unknown>)?.departure_time as string,
    route_name: ((b.shuttle_slots as Record<string, unknown>)?.shuttle_routes as Record<string, unknown>)?.name as string,
  })) as ShuttleBooking[];
}

export async function bookShuttleSlot(booking: {
  slot_id: string; guest_name: string; room_number: string; pax?: number; notes?: string;
  price_charged?: number; charge_accepted?: boolean;
}) {
  const { data } = await supabase.from('shuttle_bookings').insert({
    ...booking, pax: booking.pax || 1, notes: booking.notes || '',
    price_charged: booking.price_charged || 0, charge_accepted: booking.charge_accepted || false,
  }).select().single();
  return data;
}

export async function cancelShuttleBooking(id: string) {
  await supabase.from('shuttle_bookings').update({ status: 'cancelled' }).eq('id', id);
}

export async function createShuttleRequest(req: {
  hotel_id: string; guest_name: string; room_number: string;
  destination: string; pickup_location?: string; date?: string; time?: string;
  pax?: number; notes?: string;
}) {
  const { data } = await supabase.from('shuttle_requests').insert({
    ...req, pickup_location: req.pickup_location || 'Hotel Lobby',
    pax: req.pax || 1, notes: req.notes || '',
  }).select().single();

  // Also insert into requests table so it appears in Live Orders
  if (data) {
    const details = `Shuttle to ${req.destination}${req.date ? ` on ${req.date}` : ''}${req.time ? ` at ${req.time}` : ''}${req.pax && req.pax > 1 ? ` (${req.pax} guests)` : ''}${req.notes ? ` — ${req.notes}` : ''}`;
    await supabase.from('requests').insert({
      hotel_id: req.hotel_id,
      guest_name: req.guest_name,
      room: req.room_number,
      type: 'Shuttle Booking',
      details: details.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  return data;
}

export async function getShuttleRequests(hotelId: string): Promise<ShuttleRequest[]> {
  const { data } = await supabase.from('shuttle_requests').select(`
    *, staff_accounts!left(name)
  `).eq('hotel_id', hotelId).order('created_at', { ascending: false });
  return (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    assigned_driver_name: (r.staff_accounts as Record<string, unknown>)?.name as string || null,
  })) as ShuttleRequest[];
}

export async function updateShuttleRequest(id: string, updates: {
  status?: string; assigned_driver_id?: string | null;
}) {
  await supabase.from('shuttle_requests').update(updates).eq('id', id);
}

// ─── Cruise Schedules ────────────────────────────────────────

export interface CruiseSchedule {
  id: string;
  hotel_id: string;
  ship_name: string;
  cruise_line: string;
  terminal: string;
  departure_date: string;
  departure_time: string;
  notes: string;
  active: boolean;
  created_at: string;
}

export async function getCruiseSchedules(hotelId: string): Promise<CruiseSchedule[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('cruise_schedules').select('*')
    .eq('hotel_id', hotelId).eq('active', true)
    .gte('departure_date', today)
    .order('departure_date').order('departure_time');
  return data || [];
}

export async function getCruiseSchedulesAll(hotelId: string): Promise<CruiseSchedule[]> {
  const { data } = await supabase.from('cruise_schedules').select('*')
    .eq('hotel_id', hotelId).eq('active', true)
    .order('departure_date', { ascending: false }).order('departure_time');
  return data || [];
}

export async function createCruiseSchedule(schedule: {
  hotel_id: string; ship_name: string; cruise_line: string;
  terminal: string; departure_date: string; departure_time: string; notes?: string;
}) {
  const { data } = await supabase.from('cruise_schedules').insert({
    ...schedule, notes: schedule.notes || '', active: true,
  }).select().single();
  return data;
}

export async function deleteCruiseSchedule(id: string) {
  await supabase.from('cruise_schedules').update({ active: false }).eq('id', id);
}

// ─── Enhanced Staff CRUD ────────────────────────────────────

export async function getStaffAccountsForHotel(hotelId: string): Promise<StaffAccount[]> {
  const { data, error } = await supabase.from('staff_accounts').select('*')
    .eq('hotel_id', hotelId).order('name');
  if (error) throw error;
  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    hotel_id: s.hotel_id as string,
    name: s.name as string,
    role: s.role as string,
    email: s.email as string || '',
    phone: s.phone as string || '',
    pin_code: s.pin_code as string,
    active: s.active as boolean,
    permissions: (s.permissions as string[]) || ['orders', 'messages', 'shuttle'],
    vendor_type: s.vendor_type as string || undefined,
  }));
}

export async function createStaffAccountWithDetails(staff: {
  hotel_id: string; name: string; role: string; email?: string; phone?: string;
  pin_code: string; permissions?: string[]; vendor_type?: string;
}) {
  const { data, error } = await supabase.from('staff_accounts').insert({
    name: staff.name,
    role: staff.role || 'staff',
    hotel_id: staff.hotel_id,
    email: staff.email || '',
    phone: staff.phone || '',
    pin_code: staff.pin_code,
    permissions: staff.permissions || ['orders', 'messages', 'shuttle'],
    vendor_type: staff.vendor_type || null,
    active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateStaffPermissions(id: string, permissions: string[]) {
  await supabase.from('staff_accounts').update({ permissions }).eq('id', id);
}

export async function updateStaffDetails(id: string, updates: {
  name?: string; email?: string; phone?: string; permissions?: string[]; active?: boolean;
}) {
  await supabase.from('staff_accounts').update(updates).eq('id', id);
}

// ─── Knowledge Base ──────────────────────────────────────

export interface KnowledgeEntry {
  id: string;
  hotel_id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export async function getKnowledgeBase(hotelId: string): Promise<KnowledgeEntry[]> {
  const { data } = await supabase
    .from('hotel_knowledge_base')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('active', true)
    .order('category')
    .order('question');
  return data || [];
}

export async function getAllKnowledgeBase(hotelId: string): Promise<KnowledgeEntry[]> {
  const { data } = await supabase
    .from('hotel_knowledge_base')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('category')
    .order('question');
  return data || [];
}

export async function createKnowledgeEntry(entry: {
  hotel_id: string; category: string; question: string; answer: string; keywords?: string[]; source_url?: string;
}): Promise<KnowledgeEntry | null> {
  const { data } = await supabase
    .from('hotel_knowledge_base')
    .insert({ ...entry, keywords: entry.keywords || [], source_url: entry.source_url || null, active: true })
    .select()
    .single();
  return data;
}

export async function updateKnowledgeEntry(id: string, updates: {
  category?: string; question?: string; answer?: string; keywords?: string[]; active?: boolean; source_url?: string;
}): Promise<void> {
  await supabase
    .from('hotel_knowledge_base')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await supabase.from('hotel_knowledge_base').delete().eq('id', id);
}

// ─── Hotel Rooms (bulk upload + CRUD) ─────────────────────────

export interface HotelRoom {
  id: string;
  hotel_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  is_active: boolean;
  created_at: string;
}

export async function getHotelRooms(hotelId: string): Promise<HotelRoom[]> {
  const { data } = await supabase
    .from('hotel_rooms')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
    .order('room_number');
  return data || [];
}

export async function getAllHotelRooms(hotelId: string): Promise<HotelRoom[]> {
  const { data } = await supabase
    .from('hotel_rooms')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('room_number');
  return data || [];
}

export async function bulkInsertRooms(hotelId: string, rooms: { room_number: string; room_type?: string; floor?: number }[]) {
  // Delete existing active rooms first, then insert fresh
  await supabase.from('hotel_rooms').delete().eq('hotel_id', hotelId);
  
  if (rooms.length === 0) return [];
  
  const { data, error } = await supabase.from('hotel_rooms').insert(
    rooms.map(r => ({
      hotel_id: hotelId,
      room_number: r.room_number,
      room_type: r.room_type || '',
      floor: r.floor || 0,
      is_active: true,
    }))
  ).select();
  
  if (error) throw error;
  return data || [];
}

export async function deleteRoom(id: string) {
  await supabase.from('hotel_rooms').delete().eq('id', id);
}

export async function createRoom(hotelId: string, room: { room_number: string; room_type?: string; floor?: number }) {
  const { data, error } = await supabase.from('hotel_rooms').insert({
    hotel_id: hotelId,
    room_number: room.room_number,
    room_type: room.room_type || '',
    floor: room.floor || 0,
    is_active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRoomType(id: string, room_type: string) {
  const { error } = await supabase.from('hotel_rooms').update({ room_type }).eq('id', id);
  if (error) throw error;
}

export async function updateRoomTypeBatch(ids: Set<string>, room_type: string) {
  const idArr = Array.from(ids);
  const { error } = await supabase.from('hotel_rooms').update({ room_type }).in('id', idArr);
  if (error) throw error;
}

// ─── Staff Auth Helpers ──────────────────────────────────────

// ─── Guest Validation ───────────────────────────────────────
export async function upsertGuestValidation(hotelId: string, name: string, room: string, validatedAt: string) {
  const { error } = await supabase.from('guests').upsert({
    hotel_id: hotelId,
    name,
    room,
    checkout: validatedAt.split('T')[0],
    checked_in_at: validatedAt,
    status: 'active',
  }, { onConflict: 'hotel_id,name,room', ignoreDuplicates: false });
  if (error) throw error;
}

export async function getGuestValidations(hotelId: string): Promise<{ name: string; room: string; validatedAt: string }[]> {
  const { data } = await supabase.from('guests')
    .select('name, room, checked_in_at')
    .eq('hotel_id', hotelId)
    .eq('status', 'active');
  return (data || []).map((g: Record<string, unknown>) => ({
    name: g.name as string,
    room: g.room as string,
    validatedAt: g.checked_in_at as string,
  }));
}

export async function getStaffAccountByEmail(email: string): Promise<StaffAccount | null> {
  const { data } = await supabase.from('staff_accounts').select('*')
    .eq('email', email)
    .eq('active', true)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    hotel_id: data.hotel_id,
    name: data.name,
    role: data.role,
    email: data.email || '',
    phone: data.phone || '',
    pin_code: data.pin_code,
    active: data.active,
    permissions: data.permissions || ['orders', 'messages', 'shuttle'],
    vendor_type: data.vendor_type || undefined,
  };
}

export async function getStaffAccountByPin(pin: string, hotelSlug?: string): Promise<StaffAccount | null> {
  let query = supabase.from('staff_accounts').select('*').eq('pin_code', pin).eq('active', true).maybeSingle();
  if (hotelSlug) {
    const hotel = await getHotelConfig(hotelSlug);
    if (hotel?.id) query = supabase.from('staff_accounts').select('*').eq('pin_code', pin).eq('active', true).eq('hotel_id', hotel.id).maybeSingle();
  }
  const { data } = await query;
  if (!data) return null;
  return {
    id: data.id, hotel_id: data.hotel_id, name: data.name, role: data.role,
    email: data.email || '', phone: data.phone || '', pin_code: data.pin_code,
    active: data.active, permissions: data.permissions || ['orders', 'messages', 'shuttle'],
    vendor_type: data.vendor_type || undefined,
  };
}

// ─── Staff Checklists ───────────────────────────────────────
export interface Checklist {
  id: string;
  hotel_id: string;
  name: string;
  items: { id: string; label: string; }[];
  assigned_role: string;
  is_active: boolean;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistInstance {
  id: string;
  checklist_id: string;
  hotel_id: string;
  staff_id?: string;
  staff_name?: string;
  shift_date: string;
  checked_items: { item_id: string; checked_at: string }[];
  completed: boolean;
  created_at: string;
  completed_at?: string;
}

export async function getChecklists(hotelId: string): Promise<Checklist[]> {
  const { data } = await supabase.from('staff_checklists').select('*')
    .eq('hotel_id', hotelId).eq('is_active', true).order('name');
  return (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    items: typeof c.items === 'string' ? JSON.parse(c.items as string) : (c.items || []),
  })) as Checklist[];
}

export async function createChecklist(hotelId: string, name: string, items: { id: string; label: string }[], assignedRole?: string) {
  const { data, error } = await supabase.from('staff_checklists').insert({
    hotel_id: hotelId, name, items, assigned_role: assignedRole || 'staff',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateChecklist(id: string, updates: { name?: string; items?: { id: string; label: string }[]; assigned_role?: string; is_active?: boolean }) {
  const { error } = await supabase.from('staff_checklists').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteChecklist(id: string) {
  await supabase.from('staff_checklists').delete().eq('id', id);
}

export async function getChecklistInstances(hotelId: string, date?: string): Promise<ChecklistInstance[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('staff_checklist_instances').select('*')
    .eq('hotel_id', hotelId).eq('shift_date', d).order('created_at');
  return (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    checked_items: typeof c.checked_items === 'string' ? JSON.parse(c.checked_items as string) : (c.checked_items || []),
  })) as ChecklistInstance[];
}

export async function createChecklistInstance(instance: {
  checklist_id: string; hotel_id: string; staff_id?: string; staff_name?: string; shift_date?: string;
}) {
  const { data, error } = await supabase.from('staff_checklist_instances').insert({
    ...instance,
    shift_date: instance.shift_date || new Date().toISOString().split('T')[0],
    checked_items: [],
    completed: false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateChecklistInstance(id: string, updates: { checked_items?: { item_id: string; checked_at: string }[]; completed?: boolean }) {
  const upd: Record<string, unknown> = { ...updates };
  if (updates.completed) upd.completed_at = new Date().toISOString();
  const { error } = await supabase.from('staff_checklist_instances').update(upd).eq('id', id);
  if (error) throw error;
}

// ─── Staff Schedules ────────────────────────────────────────
export interface StaffSchedule {
  id: string;
  hotel_id: string;
  staff_id?: string;
  staff_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  department?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export async function getStaffSchedules(hotelId: string, date?: string): Promise<StaffSchedule[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('staff_schedules').select('*')
    .eq('hotel_id', hotelId).eq('shift_date', d).order('start_time');
  return (data || []) as StaffSchedule[];
}

export async function getStaffSchedulesRange(hotelId: string, from: string, to: string): Promise<StaffSchedule[]> {
  const { data } = await supabase.from('staff_schedules').select('*')
    .eq('hotel_id', hotelId).gte('shift_date', from).lte('shift_date', to).order('shift_date').order('start_time');
  return (data || []) as StaffSchedule[];
}

export async function createStaffSchedule(schedule: {
  hotel_id: string; staff_id?: string; staff_name: string;
  shift_date: string; start_time: string; end_time: string;
  role?: string; notes?: string; created_by?: string;
}) {
  const { data, error } = await supabase.from('staff_schedules').insert(schedule).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStaffSchedule(id: string) {
  await supabase.from('staff_schedules').delete().eq('id', id);
}

// ─── Daily Recap ────────────────────────────────────────────
export async function getDailyRecap(hotelId: string): Promise<{
  requestsToday: number; completedToday: number; pendingNow: number;
  messagesToday: number; shuttleBookingsToday: number;
  avgResponseMin: number;
  staffOnDuty: number;
  checklistsCompleted: number; checklistsTotal: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const [reqRes, msgRes, shuttleRes, staffRes, checklistRes] = await Promise.all([
    supabase.from('requests').select('status, created_at').eq('hotel_id', hotelId).gte('created_at', today),
    supabase.from('messages').select('id, created_at').eq('hotel_id', hotelId).gte('created_at', today),
    supabase.from('shuttle_bookings').select('id, created_at, status').gte('created_at', today),
    // These two tables lacked RLS policies until migration 004; gracefully skip on 403
    supabase.from('staff_schedules').select('id').eq('hotel_id', hotelId).eq('shift_date', today),
    supabase.from('staff_checklist_instances').select('completed').eq('hotel_id', hotelId).eq('shift_date', today),
  ]);

  // Note: staff_schedules and staff_checklist_instances lacked RLS policies
  // before migration 004. Their .data will be null on 403 errors; the
  // `(... || [])` patterns below handle this gracefully — dashboard still renders.

  const requests = reqRes.data || [];
  const requestsToday = requests.length;
  const completedToday = requests.filter((r: Record<string, unknown>) => r.status === 'completed').length;
  const pendingNow = requests.filter((r: Record<string, unknown>) => r.status === 'pending').length;
  const messagesToday = (msgRes.data || []).length;
  const shuttleBookingsToday = (shuttleRes.data || []).filter((b: Record<string, unknown>) => b.status === 'confirmed').length;

  // Avg response time: time between created_at and first status change to in-progress or completed
  const responded = requests.filter((r: Record<string, unknown>) => r.status !== 'pending');
  let avgResponseMin = 0;
  if (responded.length > 0) {
    const diffs = responded.map((r: Record<string, unknown>) => {
      const created = new Date(r.created_at as string).getTime();
      return Math.max(0, (Date.now() - created) / 60000);
    });
    avgResponseMin = Math.round(diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length);
  }

  const staffOnDuty = (staffRes.data || []).length;
  const checklists = checklistRes.data || [];
  const checklistsCompleted = checklists.filter((c: Record<string, unknown>) => c.completed).length;
  const checklistsTotal = checklists.length;

  return { requestsToday, completedToday, pendingNow, messagesToday, shuttleBookingsToday, avgResponseMin, staffOnDuty, checklistsCompleted, checklistsTotal };
}

// ═══════════════════════════════════════════════
// OPS TOOLS SYSTEM
// ═══════════════════════════════════════════════

export interface OpsTool {
  id: string;
  name: string;
  key: string;
  icon: string;
  description: string;
  category: string;
  is_built_in: boolean;
}

export interface HotelOpsTool {
  id: string;
  hotel_id: string;
  tool_key: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// ─── Ops Tools Master ─────────────────────────
export async function getAllOpsTools(): Promise<OpsTool[]> {
  const { data } = await supabase.from('ops_tools').select('*').order('name');
  return (data || []) as OpsTool[];
}

export async function createOpsTool(tool: { name: string; key: string; icon?: string; description?: string; category?: string }): Promise<OpsTool | null> {
  const { data, error } = await supabase.from('ops_tools').insert({
    name: tool.name, key: tool.key,
    icon: tool.icon || 'Tool',
    description: tool.description || '',
    category: tool.category || 'front_desk',
    is_built_in: false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateOpsTool(id: string, updates: Partial<OpsTool>): Promise<void> {
  const { error } = await supabase.from('ops_tools').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteOpsTool(id: string): Promise<void> {
  // Also clean up hotel toggles
  await supabase.from('hotel_ops_tools').delete().eq('tool_key', (await supabase.from('ops_tools').select('key').eq('id', id).single()).data?.key || '');
  await supabase.from('ops_tools').delete().eq('id', id);
}

// ─── Per-Hotel Toggles ────────────────────────
export async function getHotelOpsTools(hotelId: string): Promise<HotelOpsTool[]> {
  const { data } = await supabase.from('hotel_ops_tools').select('*').eq('hotel_id', hotelId);
  return (data || []) as HotelOpsTool[];
}

export async function setHotelOpsTool(hotelId: string, toolKey: string, enabled: boolean): Promise<void> {
  await supabase.from('hotel_ops_tools').upsert(
    { hotel_id: hotelId, tool_key: toolKey, enabled },
    { onConflict: 'hotel_id,tool_key' }
  );
}

export async function bulkEnableOpsTools(hotelId: string, toolKeys: string[]): Promise<void> {
  // Get all tools, disable ones not in list
  const allTools = await getAllOpsTools();
  const inserts = allTools.map(t => ({
    hotel_id: hotelId,
    tool_key: t.key,
    enabled: toolKeys.includes(t.key),
  }));
  // Batch upsert
  const batchSize = 50;
  for (let i = 0; i < inserts.length; i += batchSize) {
    await supabase.from('hotel_ops_tools').upsert(inserts.slice(i, i + batchSize), { onConflict: 'hotel_id,tool_key' });
  }
}

// ─── Call Around Log ───────────────────────────
export interface CallAroundLog {
  id: string;
  hotel_id: string;
  shift_date: string;
  shift: string;
  handed_off_by: string;
  received_by: string;
  occupancy: number;
  arrivals: number;
  departures: number;
  notes: string;
  created_at: string;
}

export async function getCallAroundLogs(hotelId: string, date?: string): Promise<CallAroundLog[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('call_around_logs').select('*')
    .eq('hotel_id', hotelId).eq('shift_date', d).order('created_at', { ascending: false });
  return (data || []) as CallAroundLog[];
}

export async function createCallAroundLog(log: Omit<CallAroundLog, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('call_around_logs').insert(log);
}

// ─── Daily Logs ────────────────────────────────
export interface DailyLogEntry {
  id: string;
  hotel_id: string;
  log_date: string;
  author: string;
  shift: string;
  category: string;
  content: string;
  created_at: string;
}

export async function getDailyLogs(hotelId: string, date?: string, limit = 50): Promise<DailyLogEntry[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('daily_logs').select('*')
    .eq('hotel_id', hotelId).eq('log_date', d).order('created_at', { ascending: false }).limit(limit);
  return (data || []) as DailyLogEntry[];
}

export async function createDailyLog(log: Omit<DailyLogEntry, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('daily_logs').insert(log);
}

// ─── No Shows ─────────────────────────────────
export interface NoShow {
  id: string;
  hotel_id: string;
  no_show_date: string;
  guest_name: string;
  room: string;
  reservation_ref: string;
  reason: string;
  notes: string;
  created_at: string;
}

export async function getNoShows(hotelId: string, date?: string): Promise<NoShow[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('no_shows').select('*')
    .eq('hotel_id', hotelId).eq('no_show_date', d).order('created_at', { ascending: false });
  return (data || []) as NoShow[];
}

export async function createNoShow(ns: Omit<NoShow, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('no_shows').insert(ns);
}

export async function deleteNoShow(id: string): Promise<void> {
  await supabase.from('no_shows').delete().eq('id', id);
}

// ─── Room Moves ───────────────────────────────
export interface RoomMove {
  id: string;
  hotel_id: string;
  move_date: string;
  guest_name: string;
  from_room: string;
  to_room: string;
  reason: string;
  initiated_by: string;
  notes: string;
  created_at: string;
}

export async function getRoomMoves(hotelId: string, date?: string): Promise<RoomMove[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('room_moves').select('*')
    .eq('hotel_id', hotelId).eq('move_date', d).order('created_at', { ascending: false });
  return (data || []) as RoomMove[];
}

export async function createRoomMove(move: Omit<RoomMove, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('room_moves').insert(move);
}

export async function deleteRoomMove(id: string): Promise<void> {
  await supabase.from('room_moves').delete().eq('id', id);
}

// ─── Bank Counts ───────────────────────────────
export interface BankCount {
  id: string;
  hotel_id: string;
  count_date: string;
  shift: string;
  counted_by: string;
  cash_total: number;
  card_total: number;
  room_charges: number;
  discrepancies: string;
  notes: string;
  created_at: string;
}

export async function getBankCounts(hotelId: string, date?: string): Promise<BankCount[]> {
  const d = date || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('bank_counts').select('*')
    .eq('hotel_id', hotelId).eq('count_date', d).order('created_at', { ascending: false });
  return (data || []) as BankCount[];
}

export async function createBankCount(bc: Omit<BankCount, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('bank_counts').insert(bc);
}

// ─── Daily Property Snapshot ──────────────────────────

export async function getDailyPropertySnapshot(hotelId: string): Promise<{
  occupancyPct: number;
  arrivals: number;
  departures: number;
  oooRooms: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  // Count total active rooms
  const { data: allRooms } = await supabase
    .from('hotel_rooms')
    .select('id, is_active')
    .eq('hotel_id', hotelId);

  const totalRooms = allRooms?.length || 0;
  const oooRooms = allRooms?.filter(r => !r.is_active).length || 0;

  // Count today's requests with type containing 'checkin'
  const { data: checkinRequests } = await supabase
    .from('requests')
    .select('id')
    .eq('hotel_id', hotelId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .ilike('type', '%checkin%');

  const arrivals = checkinRequests?.length || 0;

  // Count today's requests with type containing 'checkout'
  const { data: checkoutRequests } = await supabase
    .from('requests')
    .select('id')
    .eq('hotel_id', hotelId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .ilike('type', '%checkout%');

  const departures = checkoutRequests?.length || 0;

  // Calculate occupancy from active rooms vs arrivals (simple heuristic)
  const availableRooms = totalRooms - oooRooms;
  const occupancyPct = availableRooms > 0
    ? Math.min(Math.round((arrivals / availableRooms) * 100), 100)
    : 0;

  return {
    occupancyPct,
    arrivals,
    departures,
    oooRooms,
  };
}

// ─── Shift Notes ──────────────────────────────────────

export async function getShiftNotes(hotelId: string): Promise<{
  staff_name: string;
  checklist_name: string;
  notes: string;
  created_at: string;
}[]> {
  const { data } = await supabase
    .from('staff_checklist_instances')
    .select(`
      notes,
      created_at,
      staff_checklists!inner(name),
      staff_accounts!inner(name)
    `)
    .eq('hotel_id', hotelId)
    .not('notes', 'is', null)
    .not('notes', 'eq', '')
    .order('created_at', { ascending: false });

  return (data || []).map((r: Record<string, unknown>) => ({
    staff_name: (r.staff_accounts as { name: string })?.name || '',
    checklist_name: (r.staff_checklists as { name: string })?.name || '',
    notes: r.notes as string,
    created_at: r.created_at as string,
  }));
}

// ─── RDO Requests ─────────────────────────────────────

export async function getRDOs(hotelId: string): Promise<{
  id: string;
  staff_name: string;
  staff_id: string;
  requested_date: string;
  reason: string;
  status: string;
  created_at: string;
}[]> {
  const { data } = await supabase
    .from('staff_rdo_requests')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('requested_date', { ascending: false });

  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    staff_name: r.staff_name as string,
    staff_id: r.staff_id as string,
    requested_date: r.requested_date as string,
    reason: r.reason as string,
    status: r.status as string,
    created_at: r.created_at as string,
  }));
}

export async function createRDO(
  hotelId: string,
  staffName: string,
  requestedDate: string,
  reason: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('staff_rdo_requests')
    .insert({
      hotel_id: hotelId,
      staff_name: staffName,
      requested_date: requestedDate,
      reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Knowledge Base Helpers ────────────────────────────

export async function getLearningDocs(hotelId: string): Promise<KnowledgeEntry[]> {
  const { data } = await supabase
    .from('hotel_knowledge_base')
    .select('*')
    .eq('hotel_id', hotelId)
    .in('category', ['training', 'sop', 'brand_standards'])
    .eq('active', true)
    .order('category')
    .order('question');

  return data || [];
}

export async function getHrDocs(hotelId: string): Promise<KnowledgeEntry[]> {
  const { data } = await supabase
    .from('hotel_knowledge_base')
    .select('*')
    .eq('hotel_id', hotelId)
    .in('category', ['hr', 'employee'])
    .eq('active', true)
    .order('category')
    .order('question');

  return data || [];
}

export default supabase;

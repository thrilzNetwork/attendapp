import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW1zdGF0cnNlbmlkbGdqb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE5MjAsImV4cCI6MjA5NDE4NzkyMH0.1pnioO5Y_3pW2LTaYc9aliRwTkGhX2cTNLrK9jI1P-4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };

// Types
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
  permissions?: string[]; // ['orders', 'messages', 'shuttle', 'hotel', 'staff_mgmt', 'partners', 'qrcodes']
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
  if (error) { console.log('Hotel config not found:', error.message); return null; }
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
    }, { onConflict: 'slug' });
  if (error) throw error;
  return data;
}

// Request helpers
export async function getAllRequests(): Promise<RequestItem[]> {
  const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
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

export async function insertRequest(req: { guestName: string; room: string; type: string; details: string; hotelId?: string }) {
  const hotelId = req.hotelId || (await getHotelConfig())?.id;
  const { data, error } = await supabase.from('requests').insert({
    hotel_id: hotelId,
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
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  const { data, error } = await supabase.from('staff_accounts').select('*');
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
export function subscribeToRequests(callback: (payload: Record<string, unknown>) => void) {
  const channel = supabase
    .channel('requests-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
      callback(payload);
    })
    .subscribe();
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
}

export interface ShuttleSlot {
  id: string;
  route_id: string;
  departure_time: string; // "HH:MM:SS"
  days_of_week: number[];  // [1..7], empty = one-off
  date: string | null;     // ISO date for one-off
  capacity: number;        // 0 = unlimited
  active: boolean;
  route_name?: string;
  route_type?: string;
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

export async function createShuttleRoute(route: { hotel_id: string; name: string; type: string }) {
  const { data } = await supabase.from('shuttle_routes').insert(route).select().single();
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
      bookings_count: countMap[s.id as string] || 0,
    })) as ShuttleSlot[];
  }
  return (data || []).map((s: Record<string, unknown>) => ({
    ...s,
    route_name: (s.shuttle_routes as Record<string, unknown>)?.name as string,
    route_type: (s.shuttle_routes as Record<string, unknown>)?.type as string,
    bookings_count: 0,
  })) as ShuttleSlot[];
}

export async function createShuttleSlot(slot: {
  route_id: string; departure_time: string;
  days_of_week?: number[]; date?: string; capacity?: number;
}) {
  const { data } = await supabase.from('shuttle_slots').insert({
    ...slot, days_of_week: slot.days_of_week || [], capacity: slot.capacity || 0,
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
}) {
  const { data } = await supabase.from('shuttle_bookings').insert({
    ...booking, pax: booking.pax || 1, notes: booking.notes || '',
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
  }));
}

export async function createStaffAccountWithDetails(staff: {
  hotel_id: string; name: string; role: string; email?: string; phone?: string;
  pin_code: string; permissions?: string[];
}) {
  const { data, error } = await supabase.from('staff_accounts').insert({
    name: staff.name,
    role: staff.role || 'staff',
    hotel_id: staff.hotel_id,
    email: staff.email || '',
    phone: staff.phone || '',
    pin_code: staff.pin_code,
    permissions: staff.permissions || ['orders', 'messages', 'shuttle'],
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

export default supabase;

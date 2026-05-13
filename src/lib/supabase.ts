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
  wifiName: string;
  wifiPassword: string;
  welcomeLetter: string;
  managerName: string;
  teamPhotoUrl: string;
  frontDeskPhone: string;
  googleSheetUrl: string;
}

export interface StaffAccount {
  id?: string;
  name: string;
  role: string;
  pin_code: string;
  active: boolean;
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
    wifiName: data.wifi_name || '',
    wifiPassword: data.wifi_password || '',
    welcomeLetter: data.welcome_letter || '',
    managerName: data.manager_name || '',
    teamPhotoUrl: data.team_photo_url || '',
    frontDeskPhone: data.front_desk_phone || '',
    googleSheetUrl: data.google_sheet_url || '',
  };
}

export async function updateHotelConfig(config: Partial<HotelConfig>) {
  const { data, error } = await supabase
    .from('hotels')
    .upsert({
      slug: config.slug || 'miami-airport',
      name: config.name,
      wifi_name: config.wifiName,
      wifi_password: config.wifiPassword,
      welcome_letter: config.welcomeLetter,
      manager_name: config.managerName,
      team_photo_url: config.teamPhotoUrl,
      front_desk_phone: config.frontDeskPhone,
      google_sheet_url: config.googleSheetUrl,
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

export async function insertRequest(req: { guestName: string; room: string; type: string; details: string }) {
  const { data, error } = await supabase.from('requests').insert({
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

export async function createHotel(slug: string, name: string) {
  const { data, error } = await supabase.from('hotels').insert({ slug, name }).select().single();
  if (error) throw error;
  return data;
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

export default supabase;

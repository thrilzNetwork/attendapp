/* eslint-disable */
// deploy-2026-06-05-001 - force chunk hash change
'use client';

import { useState, useEffect, useCallback, useRef, Fragment, Component } from 'react';

class ErrorBoundary extends Component<{children: React.ReactNode, fallback?: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode, fallback?: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, error: null};
  }
  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }
  componentDidCatch(error: Error, info: any) {
    console.error('ERROR BOUNDARY CAUGHT:', error.message, error.stack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="p-8 text-red-600"><p className="font-bold text-[14px]">Something went wrong</p><pre className="text-[11px] mt-2 bg-red-50 p-3 rounded-xl overflow-auto">{this.state.error?.message}</pre></div>;
    }
    return this.props.children;
  }
}
import Image from 'next/image';
import {
  Bell, MessageSquare, Bus, Settings, Users,
  LogOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Save,
  Hotel as HotelIcon, ExternalLink, type LucideIcon,
  Store, QrCode as QrCodeIcon, Building2, Copy, Check, ChevronDown, ChevronUp,
  UtensilsCrossed, UserPlus, BookOpen, Pencil, X as XIcon, DoorOpen, Upload,
  FileSpreadsheet, FileText, Lock, Mail, ClipboardList, CalendarDays, SendHorizontal,
  BarChart3, GraduationCap, Briefcase, ClipboardCheck, Clock, Wifi, ImageIcon, TrendingUp, Inbox, Search, Ship, DollarSign, ShieldCheck, MapPin, PhoneCall,
} from 'lucide-react';
import {
  supabase, subscribeToRequests, subscribeToMessages, updateRequestStatus, deleteRequest,
  getHotelConfig, updateHotelConfig, HotelConfig,
  getStaffAccounts, getStaffAccountsForHotel, createStaffAccountWithDetails, getStaffAccountByEmail,
  deleteStaffAccount, updateStaffDetails, updateStaffPermissions, StaffAccount,
  getPartners, createPartner, updatePartner, deletePartner, Partner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem, PartnerMenuItem,
  getQrCodes, createQrCode, deleteQrCode, QrCode as QrCodeRow,
  getAllHotels, createHotel,
  getShuttleRoutes, createShuttleRoute, deleteShuttleRoute,
  getAllShuttleSlotsForHotel, createShuttleSlot, deleteShuttleSlot,
  getAllShuttleBookingsForHotel, cancelShuttleBooking, bookShuttleSlot,
  getShuttleRequests, updateShuttleRequest, ShuttleRoute, ShuttleSlot, ShuttleBooking, ShuttleRequest,
  getCruiseSchedulesAll, createCruiseSchedule, deleteCruiseSchedule, CruiseSchedule,
  getAllKnowledgeBase, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry, KnowledgeEntry,
  getAllHotelRooms, bulkInsertRooms, deleteRoom, createRoom, updateRoomType, updateRoomTypeBatch, HotelRoom,
  upsertGuestValidation, getGuestValidations,
  getChecklists, createChecklist, deleteChecklist, Checklist,
  getChecklistInstances, createChecklistInstance, updateChecklistInstance, ChecklistInstance,
  getStaffSchedules, getStaffSchedulesRange, createStaffSchedule, deleteStaffSchedule, StaffSchedule,
  getDailyRecap,
  getHotelOpsTools, getAllOpsTools,
  getWeeklyForecasts, upsertWeeklyForecast, WeeklyForecast,
  getLearningDocs, getHrDocs,
} from '@/lib/supabase';
import type { OpsTool } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import CallAroundView from '@/components/ops-tools/CallAroundView';
const PartnersView = dynamic(() => import('@/components/staff/PartnersView'), { ssr: false });
import DailyLogsView from '@/components/ops-tools/DailyLogsView';
import NoShowsView from '@/components/ops-tools/NoShowsView';
import RoomMovesView from '@/components/ops-tools/RoomMovesView';
import BankCountView from '@/components/ops-tools/BankCountView';

const RoomsView = dynamic(() => import('@/components/staff/RoomsView'), { ssr: false });
const SchedulesView = dynamic(() => import('@/components/staff/SchedulesView'), { ssr: false });
const ForecastView = dynamic(() => import('@/components/staff/ForecastView'), { ssr: false });
const FrontDeskView = dynamic(() => import('@/components/staff/FrontDeskView'), { ssr: false });
const PositionTodosView = dynamic(() => import('@/components/staff/PositionTodosView'), { ssr: false });
const ShuttleViewComponent = dynamic(() => import('@/components/staff/ShuttleView'), { ssr: false });
const HotelSettingsView = dynamic(() => import('@/components/staff/HotelSettingsView'), { ssr: false });
const LearningHRView = dynamic(() => import('@/components/staff/LearningHRView'), { ssr: false });
const KpisView = dynamic(() => import('@/components/staff/KpisView'), { ssr: false });
const DailyBriefView = dynamic(() => import('@/components/staff/DailyBriefView'), { ssr: false });
const CompsetView = dynamic(() => import('@/components/staff/CompsetView'), { ssr: false });
import {
  listOps, createOps, updateOps, deleteOps,
  listKpiDefinitions, createKpiDefinition, deleteKpiDefinition,
  listKpiSubmissions, createKpiSubmission,
  listChecklistTemplates, createChecklistTemplate, deleteChecklistTemplate,
  listChecklistCompletions, createChecklistCompletion, updateChecklistCompletion,
  listForecasts, createForecast as createForecastRecord,
  listShifts, createGeneratedShift, updateShift, deleteShift,
  listLearningContent, createLearningContent, deleteLearningContent,
  listHrDocuments, createHrDocument, deleteHrDocument,
  listScheduleChangeRequests, createScheduleChangeRequest,
  listShuttleSlots, listKbSuggestions, createKbSuggestion, deleteKbSuggestion, listKbSuggestionsByStatus, createKbSuggestionPending, approveKbSuggestion, rejectKbSuggestion,
  suggestResponse,
  generateShiftsFromForecast, today,
  listCourses, createCourse, deleteCourse,
  listModules, createModule, deleteModule,
  listQuizQuestions, createQuizQuestion, deleteQuizQuestion,
  listModuleCompletions, recordModuleCompletion,
  listQuizAttempts, recordQuizAttempt,
  type Course, type CourseModule, type QuizQuestion, type ModuleCompletion, type QuizAttempt,
  type KpiDefinition, type KpiSubmission,
  type ChecklistTemplate, type ChecklistCompletion,
  type Forecast, type GeneratedShift, type CoverageRule,
  type LearningContent, type HrDocument,
  type ScheduleChangeRequest,
  type OpRecord,
  type ShuttleSlot as OpsShuttleSlot,
} from '@/lib/opsStore';

/* ── Types ─────────────────────────────────────────────── */
type Role = 'admin' | 'staff' | 'superadmin' | 'vendor' | 'manager';
type NavTab =
  | 'orders' | 'messages' | 'shuttle'
  | 'hotel' | 'staff_mgmt'
  | 'partners' | 'qrcodes' | 'properties'
  | 'vendor_manifest' | 'knowledge' | 'guests' | 'rooms'
  | 'dailybrief' | 'property_info'
  | 'schedules' | 'compset' | 'checklists_tab' | 'kpis' | 'learning_hr'
  | 'shuttle_schedule' | 'forecast' | 'callouts' | 'sops' | 'todos';

interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed' | 'closed';
  created_at: string;
  assigned_to?: string;
}

interface Message {
  id: string;
  guest_name: string;
  room: string;
  sender: string;
  body: string;
  created_at: string;
}

interface Session {
  name: string;
  role: Role;
  vendorType?: string;
  department?: string;
}

/* ── Constants ─────────────────────────────────────────── */
const TEAL = '#0D9488';
const BUILD_TS = Date.now();

const DEPARTMENTS = [
  { key: 'management',   label: 'Management',   icon: '👔' },
  { key: 'front_desk',   label: 'Front Desk',   icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',  icon: '🔧' },
  { key: 'security',     label: 'Security',     icon: '🛡️' },
  { key: 'drivers',      label: 'Drivers',      icon: '🚐' },
] as const;
type DepartmentKey = typeof DEPARTMENTS[number]['key'];

const NAV: { tab: NavTab; label: string; icon: LucideIcon; roles: Role[]; section?: string }[] = [
  // ── TODAY — staff daily ops ──
  { tab: 'dailybrief',      label: 'Dashboard',         icon: BarChart3,       roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'orders',          label: 'Requests',           icon: Bell,            roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'messages',        label: 'Messages',           icon: MessageSquare,   roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'schedules',       label: 'Schedules',          icon: CalendarDays,    roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'compset',         label: 'Compset',            icon: PhoneCall,       roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },

  // ── OPERATIONS — property tools ──
  { tab: 'todos',            label: 'To-Dos',             icon: ClipboardList,   roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'shuttle',         label: 'Shuttle',            icon: Bus,             roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'kpis',            label: 'KPIs',               icon: TrendingUp,      roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'knowledge',       label: 'Right Answers',     icon: BookOpen,        roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'learning_hr',     label: 'Learning & HR',      icon: GraduationCap,   roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'property_info',   label: 'Property Info',      icon: HotelIcon,       roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },

  // ── ADMIN — settings & management ──
  { tab: 'shuttle_schedule', label: 'Shuttle Grid',      icon: Bus,             roles: ['admin', 'superadmin', 'manager'], section: 'Admin' },
  { tab: 'forecast',         label: 'Forecast',          icon: TrendingUp,      roles: ['admin', 'superadmin', 'manager'], section: 'Admin' },
  { tab: 'callouts',         label: 'Staff Callouts',    icon: ClipboardList,   roles: ['admin', 'superadmin', 'manager'], section: 'Admin' },
  { tab: 'hotel',           label: 'Property Settings',   icon: Settings,        roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'staff_mgmt',      label: 'Staff Management',   icon: Users,           roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'partners',        label: 'Partners & Menu',    icon: Store,           roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'qrcodes',         label: 'QR Codes',           icon: QrCodeIcon,       roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'rooms',            label: 'Room Management',    icon: DoorOpen,        roles: ['admin', 'superadmin'], section: 'Admin' },

  // ── PLATFORM — superadmin only ──
  { tab: 'properties',      label: 'All Properties',     icon: Building2,      roles: ['superadmin'], section: 'Platform' },

  // ── VENDOR ──
  { tab: 'vendor_manifest', label: 'Vendor Dashboard',   icon: Users,           roles: ['vendor'], section: '' },
];

/* ── Main Component ───────────────────────────────────── */
export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<NavTab>('dailybrief');
  // Auth state
  const [authMode, setAuthMode] = useState<'email' | 'authenticated'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [allHotels, setAllHotels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [showHotelPicker, setShowHotelPicker] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  // Impersonation
  const [impersonatingUser, setImpersonatingUser] = useState<{ name: string; role: Role } | null>(null);
  const [showImpersonatePicker, setShowImpersonatePicker] = useState(false);
  // ── Alert bar state (must be before early returns — React hooks rule) ──
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [lastRequestCount, setLastRequestCount] = useState(0);

  // pendingCount must be computed before early returns for the alert bar effect
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Reset alert bar when new pending tickets appear
  useEffect(() => {
    if (pendingCount > lastRequestCount) {
      setDismissedAlert(false);
    }
    setLastRequestCount(pendingCount);
  }, [pendingCount]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  // Check if already logged in (e.g., redirected from setup page)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        const email = existingSession.user.email || '';
        const meta = existingSession.user.user_metadata || {};
        if (meta.role === 'superadmin') {
          setSession({ name: email, role: 'superadmin' });
          setAuthMode('authenticated');
          getAllHotels().then(h => setAllHotels(h as { id: string; slug: string; name: string }[]));
          return;
        }
        getStaffAccountByEmail(email).then(staff => {
          if (staff) {
            const role: Role = staff.role === 'manager' || staff.role === 'admin' ? 'admin' : staff.role === 'vendor' ? 'vendor' : 'staff';
            setSession({ name: staff.name, role, vendorType: staff.vendor_type || undefined });
            setAuthMode('authenticated');
            // Save hotel slug to localStorage so config queries work
            if (staff.hotel_id) {
              supabase.from('hotels').select('slug').eq('id', staff.hotel_id).single().then(
                ({ data }) => { if (data?.slug) localStorage.setItem('attenda_hotel_slug', data.slug); }
              );
            }
          }
        });
      }
    });
  }, []);

  const handleEmailLogin = async () => {
    setAuthError('');
    if (!email || !password) { setAuthError('Email and password required.'); return; }
    setAuthLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Superadmin check — look at JWT metadata, not staff_accounts table
      if (data.user?.user_metadata?.role === 'superadmin') {
        setSession({ name: data.user.email || 'Super Admin', role: 'superadmin' });
        setAuthMode('authenticated');
        // Load all hotels for property picker
        getAllHotels().then(h => setAllHotels(h as { id: string; slug: string; name: string }[]));
        return;
      }

      // Look up staff account by email
      const staff = await getStaffAccountByEmail(email);
      if (!staff) {
        await supabase.auth.signOut();
        setAuthError('No staff account found for this email. Contact your admin.');
        setAuthLoading(false);
        return;
      }

      // Log in directly — no PIN 2FA needed
      const role: Role = staff.role === 'manager' || staff.role === 'admin' ? 'admin' : staff.role === 'vendor' ? 'vendor' : 'staff';

      // Auto-populate JWT metadata with hotel_id if missing
      // This ensures RLS policies (which check get_user_hotel_id() from JWT) work
      const meta = data.user?.user_metadata || {};
      if (!meta.hotel_id && staff.hotel_id) {
        await supabase.auth.updateUser({
          data: { hotel_id: staff.hotel_id, role: staff.role },
        });
        // Force session refresh so the JWT gets the new hotel_id
        await supabase.auth.refreshSession();
      }

      setSession({ name: staff.name, role, vendorType: staff.vendor_type || undefined });
      setAuthMode('authenticated');
      // Save hotel slug to localStorage so config queries work
      if (staff.hotel_id) {
        const { data: hotelData } = await supabase.from('hotels').select('slug').eq('id', staff.hotel_id).single();
        if (hotelData?.slug) localStorage.setItem('attenda_hotel_slug', hotelData.slug);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed.';
      if (msg.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // PIN login removed — email+password only

  const pickHotel = async (slug: string) => {
    localStorage.setItem('attenda_hotel_slug', slug);
    const c = await getHotelConfig(slug);
    if (c) setConfig(c);
    setShowHotelPicker(false);
    setAuthMode('authenticated');
  };

  const switchHotel = async (slug: string) => {
    localStorage.setItem('attenda_hotel_slug', slug);
    const c = await getHotelConfig(slug);
    if (c) { setConfig(c); setTab('orders'); }
    if (session) await reload(session.role);
  };

  const reload = useCallback(async (role: Role) => {
    // Always load config first so we can filter by hotel
    let cfg = await getHotelConfig();

    // If no hotel found in localStorage (first login / cleared storage), auto-pick for admins
    if (!cfg && (role === 'admin' || role === 'superadmin' || role === 'manager')) {
      const hotels = await getAllHotels() as { id: string; slug: string; name: string }[];
      setAllHotels(hotels);
      if (hotels.length === 1) {
        // Only one property — select it automatically
        localStorage.setItem('attenda_hotel_slug', hotels[0].slug);
        cfg = await getHotelConfig(hotels[0].slug);
      } else if (hotels.length > 1) {
        setShowHotelPicker(true);
        return;
      }
    }

    if (cfg) setConfig(cfg);
    const hotelId = cfg?.id;

    if (!hotelId) {
      setRequests([]);
      setMessages([]);
      setStaff([]);
      return;
    }

    const [req, msg] = await Promise.all([
      supabase.from('requests').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false }),
    ]);
    if (req.data) setRequests(req.data);
    if (msg.data) setMessages(msg.data);

    if (role === 'admin' || role === 'superadmin' || role === 'manager') {
      setStaff(await getStaffAccountsForHotel(hotelId!));
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    reload(session.role);
    // Load hotels list for sidebar switcher
    if (session.role === 'admin' || session.role === 'superadmin') {
      getAllHotels().then(data => setAllHotels(data as { id: string; slug: string; name: string }[]));
    }
    const hotelId = config?.id || null;
    const ch1 = subscribeToRequests(hotelId, (payload: any) => {
      // Email alert on new request
      if (payload?.eventType === 'INSERT' && payload?.new) {
        const r = payload.new;
        if (config?.notificationEmail && r.guest_name && r.room && r.type) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
            body: JSON.stringify({
              type: 'new_request',
              data: {
                notificationEmail: config.notificationEmail,
                hotelName: config.name || 'Hotel',
                guestName: r.guest_name,
                room: r.room,
                requestType: r.type,
                details: r.details || '',
              },
            }),
          }).catch(() => {});
        }
      }
      reload(session.role);
    });
    const ch2 = subscribeToMessages(hotelId, (payload: any) => {
      // Email alert on new guest message
      if (payload?.eventType === 'INSERT' && payload?.new) {
        const m = payload.new;
        if (config?.notificationEmail && m.guest_name && m.body) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
            body: JSON.stringify({
              type: 'guest_message',
              data: {
                notificationEmail: config.notificationEmail,
                hotelName: config.name || 'Hotel',
                guestName: m.guest_name,
                room: m.room || '',
                message: m.body,
              },
            }),
          }).catch(() => {});
        }
      }
      reload(session.role);
    });
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [session, reload, config]);

  /* ── Login screen ─────────────────────────────────── */
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <Mail size={24} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Staff Dashboard</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Sign in with your email and password</p>
          <div className="space-y-3">
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setAuthError(''); }} placeholder="Email address" onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} autoComplete="email" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400" />
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }} placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} autoComplete="current-password" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 pr-11" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            {authError && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{authError}</p>}
            <button onClick={handleEmailLogin} disabled={authLoading} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: TEAL }}>
              {authLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
              {authLoading ? 'Signing in...' : 'SIGN IN'}
            </button>
            <div className="text-center mt-3">
              <a href="/staff/reset-password" className="text-[12px] text-gray-400 hover:text-gray-600 underline">Forgot your password?</a>
            </div>
          </div>
          <p className="text-center mt-4 text-[12px] text-gray-400">Platform admin? <a href="/superadmin" className="font-semibold underline" style={{ color: TEAL }}>Super Admin →</a></p>
        </div>
      </div>
    );
  }

  /* ── Hotel Picker (for PIN 2025 admins with multiple properties) ─── */
  if (showHotelPicker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <Building2 size={24} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Select Property</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Choose which property to manage</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allHotels.map(h => (
              <button key={h.id} onClick={() => pickHotel(h.slug)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 transition-colors border border-gray-100 hover:border-gray-200">
                <p className="text-[14px] font-semibold text-gray-900">{h.name}</p>
                <p className="text-[11px] text-gray-400 font-mono">@{h.slug}</p>
              </button>
            ))}
          </div>
          <button onClick={() => { setShowHotelPicker(false); setSession(null); }}
            className="w-full mt-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  /* ── Impersonation Picker (superadmin only) ─────── */
  if (showImpersonatePicker) {
    const nonSuper = staff.filter(s => s.role !== 'superadmin' && s.role !== 'vendor');
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-[15px] font-bold mb-1">View as Staff Member</h2>
          <p className="text-[12px] text-gray-400 mb-4">Pick a staff member to see exactly what they see</p>
          {nonSuper.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">No staff accounts found. Add some in Staff Management first.</p>
          ) : (
            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {nonSuper.map(st => (
                <button key={st.id || st.name}
                  onClick={() => {
                    setImpersonatingUser({ name: st.name, role: st.role === 'admin' || st.role === 'manager' ? 'admin' : 'staff' });
                    setShowImpersonatePicker(false);
                    setTab('dailybrief');
                  }}
                  className="w-full text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">{st.name}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      st.role === 'admin' || st.role === 'manager' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {st.role === 'admin' || st.role === 'manager' ? 'Admin' : 'Staff'}
                    </span>
                  </div>
                  <Eye size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowImpersonatePicker(false)}
            className="w-full mt-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────── */
  const s = session!;
  // Impersonation override — superadmin can view as staff
  const effectiveRole: Role = impersonatingUser?.role || s.role;
  const visibleNav = NAV.filter(n => n.roles.includes(effectiveRole));
  const isAdmin = s.role === 'admin' || s.role === 'superadmin';
  // Vendors land on their manifest tab
  const effectiveTab = (effectiveRole === 'vendor' && tab === 'orders') ? 'vendor_manifest' : tab;

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* ── Mobile top bar ──────────────────────────── */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{config?.name || 'Attenda'}</p>
            <p className="text-[11px] text-gray-500">{s.name} ·{' '}
              <span className={`font-semibold ${s.role === 'superadmin' ? 'text-purple-600' : s.role === 'admin' ? 'text-teal-600' : 'text-blue-600'}`}>
                {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </p>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); setSession(null); setAuthMode('email'); setTab('orders'); }}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
        {/* Scrollable tab strip */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50">
          {visibleNav.map(item => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`relative shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                effectiveTab === item.tab ? 'text-white' : 'text-gray-500'
              }`}
              style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
            >
              <item.icon size={13} />
              {item.label}
              {item.tab === 'orders' && pendingCount > 0 && (
                <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-[230px] bg-[#F3F4F6] flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <div className="inline-flex items-center justify-center w-10 h-6 rounded mb-2" style={{ backgroundColor: `${TEAL}20` }}>
            <span className="text-[10px] font-bold" style={{ color: TEAL }}>A</span>
          </div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
            {config?.name || 'Attenda'}
          </h2>
          {isAdmin ? (
            <select
              value={config?.slug || ''}
              onChange={e => switchHotel(e.target.value)}
              className="w-full mt-1 text-[11px] text-gray-500 bg-transparent border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-400"
            >
              {allHotels.length === 0 && (
                // Lazy load hotels the first time
                <option value={config?.slug || ''}>{config?.slug || 'Loading...'}</option>
              )}
              {allHotels.map(h => (
                <option key={h.slug} value={h.slug}>{h.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-[12px] text-gray-500">
              {config?.slug ? `@${config.slug}` : 'Dashboard'}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Logged in as</p>
          <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
          {impersonatingUser ? (
            <>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Impersonating</span>
                <span className="text-[11px] text-gray-500">{impersonatingUser.name}</span>
              </div>
              <button onClick={() => setImpersonatingUser(null)} className="mt-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">
                Stop Impersonating
              </button>
            </>
          ) : (
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              s.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
              s.role === 'admin' ? 'bg-teal-100 text-teal-700' :
              s.role === 'vendor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : s.role === 'vendor' ? `Vendor · ${s.vendorType || ''}` : 'Staff'}
            </span>
          )}
          {s.role === 'superadmin' && !impersonatingUser && (
            <button onClick={() => setShowImpersonatePicker(true)} className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
              <Eye size={12} /> View as Staff
            </button>
          )}
        </div>

        <nav className="px-3 py-3 flex-1">
          {(() => {
            const sections = new Map<string, typeof visibleNav>();
            visibleNav.forEach(item => {
              const s = item.section || '';
              if (!sections.has(s)) sections.set(s, []);
              sections.get(s)!.push(item);
            });
            const sectionOrder = ['Today', 'Operations', 'Admin', 'Platform', ''];
            const sectionLabels: Record<string, string> = {
              'Today': 'TODAY',
              'Operations': 'OPERATIONS',
              'Admin': 'ADMIN',
              'Platform': 'PLATFORM',
              '': '',
            };
            const result: JSX.Element[] = [];
            sectionOrder.forEach(sec => {
              const items = sections.get(sec);
              if (!items || items.length === 0) return;
              if (sec) {
                result.push(
                  <p key={`h-${sec}`} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{sectionLabels[sec]}</p>
                );
              }
              items.forEach(item => {
                result.push(
                  <button
                    key={item.tab}
                    onClick={() => setTab(item.tab)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors text-left mb-0.5 ${
                      effectiveTab === item.tab ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'
                    }`}
                    style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
                  >
                    <item.icon size={15} />
                    {item.label}
                    {item.tab === 'orders' && pendingCount > 0 && (
                      <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              });
            });
            return result;
          })()}
        </nav>

        <div className="p-4 border-t border-gray-200/60">
          <button
            onClick={() => { supabase.auth.signOut(); setSession(null); setAuthMode('email'); setTab('orders'); }}
            className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-[#FAFAFA]">
        {/* ── Persistent ticket alert bar ── */}
        {pendingCount > 0 && !dismissedAlert && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 md:px-8 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-[13px] font-semibold text-amber-800 truncate">
                <strong>{pendingCount}</strong> open ticket{pendingCount === 1 ? '' : 's'} — check Requests tab
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setTab('orders'); setDismissedAlert(true); }}
                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => setDismissedAlert(true)}
                className="text-[11px] text-amber-500 hover:text-amber-700 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* ── Silent "all clear" when no open tickets ── */}
        {pendingCount === 0 && !dismissedAlert && requests.length > 0 && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 md:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-[13px] font-semibold text-emerald-700">No open tickets — all clear ✅</p>
            </div>
            <button
              onClick={() => setDismissedAlert(true)}
              className="text-[11px] text-emerald-500 hover:text-emerald-700 font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        {effectiveTab === 'dailybrief' && (
          <ErrorBoundary fallback={<div className="p-4 md:p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-6"><p className="text-[16px] font-bold text-red-800 mb-2">Dashboard error</p><pre id="error-message" className="text-[12px] text-red-700 whitespace-pre-wrap bg-red-100 p-4 rounded-xl">{/* error will show here */}</pre></div></div>}>
            <DailyBriefView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} config={config} sessionName={session?.name || ''} department={session?.department} isAdmin={isAdmin} />
          </ErrorBoundary>
        )}
        {effectiveTab === 'property_info' && config && (
          <PropertyInfoView config={config} />
        )}
        {effectiveTab === 'schedules' && (
          <SchedulesView hotelId={config?.id || ''} isAdmin={isAdmin} weekStartsOn={config?.weekStartsOn || 'Sunday'} staffName={s.name} hotelName={config?.name || 'Hotel'} staffList={staff.map(s => ({ id: s.id, name: s.name, role: s.role, department: s.department, hire_date: s.hire_date, min_hours: s.min_hours || 0, employment_type: s.employment_type, email: s.email || '' }))} />
        )}
        {effectiveTab === 'compset' && (
          <CompsetView hotelId={config?.id || ''} isAdmin={isAdmin} staffId={staff.find(st => st.name === s.name)?.id || ''} staffName={s.name} />
        )}
        {effectiveTab === 'checklists_tab' && (
          <ChecklistsTabView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {effectiveTab === 'kpis' && (
          <KpisView hotelId={config?.id || ''} isAdmin={isAdmin} userId="" userName={session?.name || 'Staff'} />
        )}
        {effectiveTab === 'learning_hr' && (
          <LearningHRView hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'orders' && (
          <OrdersView
            requests={requests}
            messages={messages}
            staffName={s.name}
            onStatusChange={async (id, status, assigned_to) => { await updateRequestStatus(id, status, assigned_to); reload(s.role); }}
            onDelete={async id => { await deleteRequest(id); reload(s.role); }}
            onRefresh={() => reload(s.role)}
          />
        )}
        {effectiveTab === 'messages' && (
          <MessagesView messages={messages} hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'shuttle' && (
          <ShuttleViewComponent hotelId={config?.id || ''} isAdmin={isAdmin} staffName={s.name} />
        )}
        {effectiveTab === 'shuttle_schedule' && (
          <ShuttleScheduleView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {effectiveTab === 'forecast' && (
          <ForecastView hotelId={config?.id || ''} totalRooms={config?.roomCount || 0} timezone={config?.timezone} />
        )}
        {effectiveTab === 'callouts' && (
          <AdminCalloutsView hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'todos' && (
          <PositionTodosView hotelId={config?.id || ''} isAdmin={isAdmin} staffName={s.name} department={s.department} />
        )}
        {effectiveTab === 'vendor_manifest' && (
          <VendorDashboard hotelId={config?.id || ''} vendorType={s.vendorType || 'shuttle'} vendorName={s.name} />
        )}
        {effectiveTab === 'hotel' && isAdmin && config && (
                  <ErrorBoundary>
                    <HotelSettingsView
                      config={config}
                      onSaved={async () => { const c = await getHotelConfig(); if (c) setConfig(c); }}
                    />
                  </ErrorBoundary>
                )}
        {effectiveTab === 'staff_mgmt' && isAdmin && (
          <StaffView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} hotelSlug={config?.slug || ''} staff={staff} onRefresh={async () => setStaff(await getStaffAccountsForHotel(config?.id || ''))} />
        )}
        {effectiveTab === 'partners' && isAdmin && (
          <PartnersView hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'qrcodes' && isAdmin && (
          <QrCodesView hotelId={config?.id || ''} hotelSlug={config?.slug || ''} />
        )}
        {effectiveTab === 'knowledge' && (
          <IncidentKBView hotelId={config?.id || ''} isAdmin={isAdmin} userName={s.name} />
        )}
        {effectiveTab === 'rooms' && isAdmin && (
          <RoomsView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} />
        )}
        {effectiveTab === 'properties' && s.role === 'superadmin' && (
          <PropertiesView
            onSwitchHotel={async (slug: string) => {
              localStorage.setItem('attenda_hotel_slug', slug);
              const c = await getHotelConfig(slug);
              if (c) { setConfig(c); setTab('orders'); }
            }}
          />
        )}
        {effectiveTab === 'guests' && (
          <GuestsView hotelId={config?.id || ''} />
        )}
      </main>
    </div>
  );
}

/* ── Orders View (dynamic import) ──────────────────────── */
const OrdersView = dynamic(() => import('@/components/staff/OrdersView'), { ssr: false });

/* ── Messages View (WhatsApp-Style Split) ──────────────── */
function MessagesView({ messages, hotelId }: { messages: Message[]; hotelId?: string }) {
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [staffChannel, setStaffChannel] = useState<Message[]>([]);
  const [staffMsg, setStaffMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalTab, setInternalTab] = useState<'guest' | 'staff'>('guest');

  // Load staff messages
  useEffect(() => {
    if (!hotelId) return;
    supabase.from('messages')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('sender', 'staff')
      .eq('room', '__staff__')
      .order('created_at', { ascending: true })
      .then(({ data }) => setStaffChannel(data || []));
  }, [hotelId]);

  // Subscribe to new staff messages
  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase
      .channel('staff-messages-live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `hotel_id=eq.${hotelId}` },
        () => {
          supabase.from('messages')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('sender', 'staff')
            .eq('room', '__staff__')
            .order('created_at', { ascending: true })
            .then(({ data }) => setStaffChannel(data || []));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId]);

  // Build conversation groups (by guest_name), sorted by most recent
  const byGuest = new Map<string, Message[]>();
  messages.forEach(msg => {
    const arr = byGuest.get(msg.guest_name) || [];
    arr.push(msg);
    byGuest.set(msg.guest_name, arr);
  });
  const groups: { guest_name: string; room: string; messages: Message[]; lastMsg: Message; unread: number }[] = [];
  byGuest.forEach((msgs, name) => {
    // Filter out internal staff messages from guest view
    const real = msgs.filter(m => m.room !== '__staff__');
    if (real.length === 0) return;
    real.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    groups.push({
      guest_name: name,
      room: real[real.length - 1].room,
      messages: real,
      lastMsg: real[real.length - 1],
      unread: real.length,
    });
  });
  groups.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());

  const selected = groups.find(g => g.guest_name === selectedGuest);
  const [showArchived, setShowArchived] = useState(false);

  // Split into today's active convos vs archived (no activity today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeGroups = groups.filter(g => new Date(g.lastMsg.created_at) >= today);
  const archivedGroups = groups.filter(g => new Date(g.lastMsg.created_at) < today);

  const filteredGroups = showArchived ? archivedGroups : activeGroups;

  const handleSend = async () => {
    if (!replyText.trim() || !selected || !hotelId) return;
    await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: selected.guest_name,
      room: selected.room,
      sender: 'staff',
      body: replyText.trim(),
    });
    setReplyText('');
  };

  const sendStaffMessage = async () => {
    if (!staffMsg.trim() || !hotelId) return;
    await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: 'Staff Channel',
      room: '__staff__',
      sender: 'staff',
      body: staffMsg.trim(),
    });
    setStaffMsg('');
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selected, selectedGuest]);

  /* ── Left Panel: Contact List ────────────────────────── */
  const contactList = (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200">
        <h2 className="text-[15px] font-extrabold text-gray-900">Chats</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">{activeGroups.length} active · {archivedGroups.length} archived</p>
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
        <button onClick={() => setShowArchived(false)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${!showArchived ? 'bg-teal-100 text-teal-800' : 'text-gray-500 hover:bg-gray-100'}`}>Active ({activeGroups.length})</button>
        <button onClick={() => setShowArchived(true)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${showArchived ? 'bg-teal-100 text-teal-800' : 'text-gray-500 hover:bg-gray-100'}`}>Archived ({archivedGroups.length})</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-500">{showArchived ? 'No archived conversations.' : 'No active conversations today.'}</p>
          </div>
        ) : (
          filteredGroups.map(g => (
            <button
              key={g.guest_name}
              onClick={() => setSelectedGuest(g.guest_name)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedGuest === g.guest_name ? 'bg-teal-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                {g.guest_name.charAt(0).toUpperCase()}
              </div>
              {/* Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{g.guest_name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {new Date(g.lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  Room {g.room} — {g.lastMsg.body}
                </p>
              </div>
              {/* Unread badge */}
              {g.unread > 0 && (
                <span className="text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL }}>
                  {g.unread}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  /* ── Right Panel: Chat History + Reply ───────────────── */
  const chatContent = selected ? (
    <div className="h-full flex flex-col bg-[#ECE5DD]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <button
          onClick={() => setSelectedGuest(null)}
          className="lg:hidden text-gray-500 hover:text-gray-700"
          aria-label="Back to conversations"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
          {selected.guest_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{selected.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {selected.room}</p>
        </div>
      </div>

      {/* Message bubbles (all) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {selected.messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
              msg.sender === 'staff'
                ? 'bg-[#DCF8C6] text-gray-800 rounded-br-md'   // staff = sent = green bubble
                : 'bg-white text-gray-800 rounded-bl-md'        // guest = received = white bubble
            }`}>
              {msg.body}
            </div>
            <span className="text-[9px] text-gray-400 mt-0.5 px-1">
              {msg.sender === 'staff' ? 'Staff' : msg.guest_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Reply input */}
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a reply..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none border border-gray-200 placeholder-gray-400 focus:border-teal-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="px-5 py-2.5 rounded-full text-white font-semibold text-[13px] disabled:opacity-40 transition-colors"
            style={{ backgroundColor: TEAL }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <MessageSquare size={44} className="text-gray-200 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500 font-medium">Select a conversation</p>
        <p className="text-[11px] text-gray-400 mt-1">Choose a guest from the sidebar to view their messages.</p>
      </div>
    </div>
  );

  /* ── Tab switcher ────────────────────────────────────── */
  const tabBar = (
    <div className="flex gap-0.5 p-2 bg-gray-100 rounded-xl mb-3 mx-4 mt-3">
      <button onClick={() => setInternalTab('guest')}
        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${internalTab === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
        Guest Chats ({activeGroups.length + archivedGroups.length})
      </button>
      <button onClick={() => setInternalTab('staff')}
        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${internalTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
        Staff Channel ({staffChannel.length})
      </button>
    </div>
  );

  /* ── Staff Channel View ─────────────────────────────── */
  const staffChannelView = (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-[15px] font-extrabold text-gray-900">Staff Channel</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Internal team messages — all staff see this</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
        {staffChannel.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-500">No staff messages yet.</p>
          </div>
        ) : (
          staffChannel.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-start' : 'items-end'}`}>
              <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm bg-white text-gray-800 rounded-bl-md">
                <p className="text-[10px] font-bold text-gray-500 mb-0.5">{msg.guest_name}</p>
                {msg.body}
              </div>
              <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input value={staffMsg} onChange={e => setStaffMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendStaffMessage(); } }}
            placeholder="Message the team..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none border border-gray-200 placeholder-gray-400" />
          <button onClick={sendStaffMessage} disabled={!staffMsg.trim()}
            className="px-5 py-2.5 rounded-full text-white font-semibold text-[13px] disabled:opacity-40" style={{ backgroundColor: TEAL }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Layout: Desktop = split, Mobile = full screen ─── */
  return internalTab === 'staff' ? (
    <div className="h-full">{staffChannelView}</div>
  ) : (
    <div className="h-full flex flex-col">
      {tabBar}
      <div className="flex-1 flex">
        {/* Left panel — hidden on mobile when a conversation is open */}
        <div className="hidden lg:flex lg:flex-col w-80 border-r border-gray-200 shrink-0">
          {contactList}
        </div>
        <div className={`lg:hidden w-full ${selectedGuest ? 'hidden' : 'block'}`}>
          {contactList}
        </div>

        {/* Right panel — chat */}
        <div className={`flex-1 min-w-0 ${selectedGuest ? 'block' : 'hidden lg:block'}`}>
          {chatContent}
        </div>
      </div>
    </div>
  );
}

/* ── Shuttle Routes Panel ───────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShuttleRoutesPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [bookings, setBookings] = useState<Record<string, ShuttleBooking[]>>({});
  const [loading, setLoading] = useState(true);
  const [newRoute, setNewRoute] = useState({ name: '', type: 'airport', price: 0 });
  const [newSlot, setNewSlot] = useState<{ route_id: string; show: boolean; time: string; days: number[]; capacity: number; event_label: string; override_price: number | null }>({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null });
  const [batch, setBatch] = useState<{ route_id: string; show: boolean; from: string; to: string; interval: number; days: number[]; capacity: number; override_price: number | null }>({ route_id: '', show: false, from: '', to: '', interval: 60, days: [1,2,3,4,5,6,7], capacity: 0, override_price: null });
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const load = useCallback(async () => {
    const r = await getShuttleRoutes(hotelId);
    setRoutes(r);
    const s = await getAllShuttleSlotsForHotel(hotelId);
    setSlots(s);
    const b = await getAllShuttleBookingsForHotel(hotelId);
    const bySlot: Record<string, ShuttleBooking[]> = {};
    b.forEach(bk => { if (!bySlot[bk.slot_id]) bySlot[bk.slot_id] = []; bySlot[bk.slot_id].push(bk); });
    setBookings(bySlot);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAddRoute = async () => {
    if (!newRoute.name) return;
    await createShuttleRoute({ hotel_id: hotelId, name: newRoute.name, type: newRoute.type, price: newRoute.price });
    setNewRoute({ name: '', type: 'airport', price: 0 });
    load();
  };

  const handleAddSlot = async () => {
    if (!newSlot.time || !newSlot.route_id) return;
    await createShuttleSlot({ route_id: newSlot.route_id, hotel_id: hotelId, departure_time: newSlot.time + ':00', days_of_week: newSlot.days, capacity: newSlot.capacity, event_label: newSlot.event_label, override_price: newSlot.override_price ?? undefined });
    setNewSlot({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null });
    load();
  };

  const handleBatchGenerate = async () => {
    if (!batch.from || !batch.to || !batch.route_id) return;
    const [startH, startM] = batch.from.split(':').map(Number);
    const [endH, endM] = batch.to.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const generated: { route_id: string; hotel_id: string; departure_time: string; days_of_week: number[]; capacity: number; override_price?: number }[] = [];
    for (let m = startMinutes; m <= endMinutes; m += batch.interval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const departure_time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
      generated.push({ route_id: batch.route_id, hotel_id: hotelId, days_of_week: batch.days, departure_time, capacity: batch.capacity, override_price: batch.override_price ?? undefined });
    }
    await Promise.all(generated.map(g => createShuttleSlot(g)));
    setBatch({ route_id: '', show: false, from: '', to: '', interval: 60, days: [1,2,3,4,5,6,7], capacity: 0, override_price: null });
    load();
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* Add Route */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Route</h3>
          <div className="flex gap-2 items-end flex-wrap">
            <input placeholder="Route name (e.g. MIA Airport)" value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
              className="flex-1 min-w-[160px] bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            <select value={newRoute.type} onChange={e => setNewRoute({ ...newRoute, type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
              <option value="airport">Airport (free)</option><option value="cruise">Cruise Port</option><option value="custom">Custom</option>
            </select>
            <div>
              <label className="text-[10px] text-gray-400 block">$ per person</label>
              <input type="number" min="0" step="0.01" value={newRoute.price || ''} placeholder="0" onChange={e => setNewRoute({ ...newRoute, price: parseFloat(e.target.value)||0 })}
                className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none w-[72px]" />
            </div>
            <button onClick={handleAddRoute} className="px-4 py-2.5 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: '#0D9488' }}>Add</button>
          </div>
        </div>
      )}

      {/* Routes & Slots */}
      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No shuttle routes configured yet.</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Add your first route above.</p>}
        </div>
      ) : routes.map(route => {
        const routeSlots = slots.filter(s => s.route_id === route.id);
        return (
          <div key={route.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-700">{route.type}</span>
                <h3 className="font-extrabold text-[16px] text-gray-900">{route.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: (route.price||0) > 0 ? '#FEF3C7' : '#D1FAE5', color: (route.price||0) > 0 ? '#92400E' : '#065F46' }}>{(route.price||0) > 0 ? `$${route.price}/person` : 'Free'}</span>
                <span className="text-[12px] text-gray-400">{routeSlots.length} slots</span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setNewSlot({ route_id: route.id, show: true, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null }); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-600">+ Slot</button>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete this route and all slots?')) { deleteShuttleRoute(route.id); load(); } }}
                      className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
                {expandedRoute === route.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedRoute === route.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                {/* Add slot form */}
                {newSlot.show && newSlot.route_id === route.id && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-end">
                        <div>
                          <label className="text-[10px] text-gray-400 block">Time</label>
                          <input type="time" value={newSlot.time} onChange={e => setNewSlot({ ...newSlot, time: e.target.value })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Capacity (0=unlimited)</label>
                          <input type="number" min="0" max="99" value={newSlot.capacity} onChange={e => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value)||0 })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-24" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Override $ (optional)</label>
                          <input type="number" min="0" step="0.01" value={newSlot.override_price ?? ''} placeholder="--" onChange={e => setNewSlot({ ...newSlot, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-[80px]" />
                        </div>
                        <button onClick={handleAddSlot} className="px-4 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#0D9488' }}>Save</button>
                        <button onClick={() => setNewSlot({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null })} className="px-3 py-2 text-[12px] text-gray-400">Cancel</button>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block">Event / Cruise Line (optional)</label>
                        <input value={newSlot.event_label} onChange={e => setNewSlot({ ...newSlot, event_label: e.target.value })} placeholder="e.g. Royal Caribbean · May 17" 
                          className="w-full bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((d, i) => {
                        const dayNum = i + 1;
                        const active = newSlot.days.includes(dayNum);
                        return (
                          <button key={d} onClick={() => setNewSlot({ ...newSlot, days: active ? newSlot.days.filter(x => x !== dayNum) : [...newSlot.days, dayNum] })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Batch generate slots */}{isAdmin && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[13px] text-gray-800">⚡ Generate Hours</h4>
                      <button onClick={() => setBatch(batch.show && batch.route_id === route.id ? { ...batch, show: false } : { route_id: route.id, show: true, from: '', to: '', interval: 60, days: [1,2,3,4,5,6,7], capacity: 0, override_price: null })}
                        className="text-[11px] font-bold text-teal-600">{batch.show && batch.route_id === route.id ? 'Close' : 'Open'}</button>
                    </div>
                    {batch.show && batch.route_id === route.id && (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-500">Generate slots every X minutes, from start to end time.</p>
                        <div className="flex gap-2 items-end flex-wrap">
                          <div>
                            <label className="text-[10px] text-gray-400 block">From</label>
                            <input type="time" value={batch.from} onChange={e => setBatch({ ...batch, from: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-28" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">To</label>
                            <input type="time" value={batch.to} onChange={e => setBatch({ ...batch, to: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-28" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">Every (min)</label>
                            <select value={batch.interval} onChange={e => setBatch({ ...batch, interval: parseInt(e.target.value) })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none">
                              <option value={30}>30 min</option>
                              <option value={60}>1 hour</option>
                              <option value={120}>2 hours</option>
                              <option value={180}>3 hours</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">Capacity</label>
                            <input type="number" min="0" max="99" value={batch.capacity} onChange={e => setBatch({ ...batch, capacity: parseInt(e.target.value)||0 })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-20" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">$ per person</label>
                            <input type="number" min="0" step="0.01" value={batch.override_price ?? ''} placeholder="0" onChange={e => setBatch({ ...batch, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-20" />
                          </div>
                          <button onClick={handleBatchGenerate} className="px-4 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#0D9488' }}>Generate</button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {DAYS.map((d, i) => {
                            const dayNum = i + 1;
                            const active = batch.days.includes(dayNum);
                            return (
                              <button key={d} onClick={() => setBatch({ ...batch, days: active ? batch.days.filter(x => x !== dayNum) : [...batch.days, dayNum] })}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}</button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Slots list */}
                {routeSlots.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-2">No time slots yet.</p>
                ) : routeSlots.map(slot => {
                  const slotBookings = bookings[slot.id] || [];
                  const dayNames = (slot.days_of_week || []).map(d => DAYS[d-1]).join(', ') || 'One-off';
                  return (
                    <div key={slot.id} className="bg-white rounded-xl border border-gray-100 mb-2 overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}>
                        <div className="flex items-center gap-4">
                          <span className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0,5)}</span>
                          <span className="text-[11px] text-gray-400">{slot.event_label ? slot.event_label : dayNames}</span>
                          {(slot.override_price ?? slot.route_price ?? 0) > 0 && <span className="text-[11px] font-semibold text-amber-700">${slot.override_price ?? slot.route_price}/pp</span>}
                          {slot.capacity > 0 && <span className="text-[11px] font-semibold text-emerald-600">{slot.capacity - slotBookings.length} / {slot.capacity} spots</span>}
                          <span className="text-[11px] font-semibold text-purple-600">{slotBookings.length} booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && <button onClick={e => { e.stopPropagation(); if(confirm('Delete slot?')) { deleteShuttleSlot(slot.id); load(); } }} className="text-red-400"><Trash2 size={12} /></button>}
                          {expandedSlot === slot.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                      {expandedSlot === slot.id && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          {slotBookings.length === 0 ? (
                            <p className="text-[12px] text-gray-400">No bookings yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {slotBookings.map(b => (
                                <div key={b.id} className="flex items-center justify-between text-[12px]">
                                  <div>
                                    <span className="font-semibold text-gray-800">{b.guest_name} · Room {b.room_number} · {b.pax} pax</span>
                                    {(b.price_charged || 0) > 0 && <span className="ml-2 text-[10px] text-amber-700 font-bold">${b.price_charged} charged {b.charge_accepted ? '✅' : '⚠️ not accepted'}</span>}
                                  </div>
                                  <button onClick={() => { cancelShuttleBooking(b.id); load(); }} className="text-[10px] text-red-500 font-bold">Cancel</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Add guest manually — for front desk walk-ups */}
                          {isAdmin && (
                            <AddGuestToSlot slotId={slot.id} routeName={slot.event_label || dayNames} onDone={load} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Shuttle Requests Panel ─────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShuttleRequestsPanel({ hotelId }: { hotelId: string }) {
  const [requests, setRequests] = useState<ShuttleRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [reqs, staff] = await Promise.all([getShuttleRequests(hotelId), getStaffAccountsForHotel(hotelId)]);
    setRequests(reqs);
    setStaffList(staff.filter(s => s.active));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'assigned' || r.status === 'in_progress');
  const done = requests.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="space-y-6">
      {pending.length + active.length === 0 && done.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No pickup requests yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-amber-600 uppercase tracking-wider mb-2">Pending ({pending.length})</h3>
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number} · {r.pax} pax</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · {r.date || 'No date'} {r.time || ''}</p>
                        {r.notes && <p className="text-[11px] text-gray-400 mt-0.5">{r.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select onChange={async e => { if(e.target.value) { await updateShuttleRequest(r.id, { assigned_driver_id: e.target.value, status: 'assigned' }); load(); } }}
                        className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border text-[12px] outline-none">
                        <option value="">Assign driver...</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `· ${s.phone}` : ''}</option>)}
                      </select>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'cancelled' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-red-600 bg-red-50">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-2">In Progress ({active.length})</h3>
              <div className="space-y-2">
                {active.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number}</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · Driver: {r.assigned_driver_name || 'Unassigned'}</p>
                      </div>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'completed' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: '#0D9488' }}>Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Completed ({done.length})</summary>
              <div className="space-y-1 mt-2">
                {done.map(r => (
                  <div key={r.id} className="flex items-center gap-3 text-[12px] text-gray-500 py-1">
                    <span>{r.guest_name} · {r.destination}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100">{r.status}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/* ── Cruise Calendar Panel ───────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CruiseCalendarPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const data = await getCruiseSchedulesAll(hotelId);
    setSchedules(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.ship_name || !form.departure_date || !form.departure_time) return;
    setAdding(true);
    await createCruiseSchedule({ hotel_id: hotelId, ...form });
    setForm({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
    await load();
    setAdding(false);
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = schedules.filter(s => s.departure_date >= today);
  const past = schedules.filter(s => s.departure_date < today);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Cruise Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Ship Name *</label>
              <input value={form.ship_name} onChange={e => setForm({ ...form, ship_name: e.target.value })} placeholder="e.g. Harmony of the Seas"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Cruise Line</label>
              <input value={form.cruise_line} onChange={e => setForm({ ...form, cruise_line: e.target.value })} placeholder="e.g. Royal Caribbean"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Terminal</label>
              <input value={form.terminal} onChange={e => setForm({ ...form, terminal: e.target.value })} placeholder="e.g. Terminal D"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Date *</label>
              <input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Time *</label>
              <input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Pier, parking, check-in info..."
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding || !form.ship_name || !form.departure_date || !form.departure_time}
            className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-[13px] disabled:opacity-40"
            style={{ backgroundColor: TEAL }}>
            {adding ? 'Adding...' : 'Add to Calendar'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-[18px]">🚢</span>
          <h3 className="font-extrabold text-[15px]">Upcoming Departures ({upcoming.length})</h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No upcoming cruises scheduled.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.cruise_line || 'Cruise'}</span>
                    {s.terminal && <span className="text-[11px] text-gray-400">{s.terminal}</span>}
                  </div>
                  <p className="text-[15px] font-bold text-gray-900">{s.ship_name}</p>
                  <p className="text-[13px] text-gray-600">
                    {new Date(s.departure_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {s.departure_time.slice(0, 5)}
                  </p>
                  {s.notes && <p className="text-[11px] text-gray-400 mt-0.5">{s.notes}</p>}
                </div>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }}
                    className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Past Departures ({past.length})</summary>
          <div className="space-y-2 mt-3">
            {past.map(s => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                <span className="text-gray-500">{s.ship_name} · {s.departure_date} {s.departure_time.slice(0,5)}</span>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }} className="text-red-400 text-[11px]">Remove</button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Vendor Dashboard ────────────────────────────────────── */
function VendorDashboard({ hotelId, vendorType, vendorName }: { hotelId: string; vendorType: string; vendorName: string }) {
  const isShuttle = vendorType === 'shuttle' || vendorType === 'taxi';
  const isCatering = vendorType === 'catering' || vendorType === 'restaurant';

  return (
    <div>
      {isShuttle && <ShuttleVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
      {isCatering && <RestaurantVendorView hotelId={hotelId} vendorName={vendorName} />}
      {!isShuttle && !isCatering && <GeneralVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
    </div>
  );
}

function ShuttleVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [bookings, setBookings] = useState<ShuttleBooking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [allBookings, allSlots] = await Promise.all([
      getAllShuttleBookingsForHotel(hotelId),
      getAllShuttleSlotsForHotel(hotelId),
    ]);
    setBookings(allBookings);
    setSlots(allSlots);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));
  const filteredBookings = bookings.filter(b => {
    if (!dateFilter) return true;
    const slot = slotMap[b.slot_id];
    return (slot?.date || today) === dateFilter;
  });
  const totalPax = filteredBookings.reduce((sum, b) => sum + (b.pax || 1), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Passenger Manifest</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType} operator</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Bookings</p>
          <p className="text-[28px] font-extrabold text-teal-600">{filteredBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Passengers</p>
          <p className="text-[28px] font-extrabold text-blue-600">{totalPax}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Routes Active</p>
          <p className="text-[28px] font-extrabold text-gray-700">{slots.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-[12px] text-gray-400">Clear</button>}
        <span className="text-[12px] text-gray-400">{dateFilter ? `Showing ${dateFilter}` : 'All bookings'}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Booking List ({filteredBookings.length})</h3>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No bookings found.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredBookings.map((b, i) => {
              const slot = slotMap[b.slot_id];
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[12px] font-bold text-gray-400 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-900">{b.guest_name}</p>
                    <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax{b.notes ? ` · ${b.notes}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-gray-700">{slot?.route_name || b.route_name || '—'}</p>
                    <p className="text-[11px] text-gray-400">{slot?.departure_time?.slice(0,5) || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantVendorView({ hotelId, vendorName }: { hotelId: string; vendorName: string }) {
  const [orders, setOrders] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('type', 'Food Order')
      .order('created_at', { ascending: false });
    setOrders((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await updateRequestStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as Request['status'] } : o));
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = orders.filter(o => o.status === 'pending');
  const inProgress = orders.filter(o => o.status === 'in-progress');
  const completed = orders.filter(o => o.status === 'completed');

  const OrderCard = ({ order }: { order: Request }) => (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${order.status === 'pending' ? 'border-amber-300' : order.status === 'in-progress' ? 'border-teal-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[14px] font-bold text-gray-900">{order.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {order.room} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
          {order.status}
        </span>
      </div>
      <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{order.details}</p>
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button onClick={() => updateStatus(order.id, 'in-progress')}
            className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            Start Preparing
          </button>
        )}
        {order.status === 'in-progress' && (
          <button onClick={() => updateStatus(order.id, 'completed')}
            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-bold">
            Mark Delivered
          </button>
        )}
        {order.status === 'completed' && (
          <span className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-400 text-[12px] font-bold text-center">Delivered</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Incoming Orders</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · Food & Beverage</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
          <p className="text-[11px] text-teal-500 uppercase font-bold">Preparing</p>
          <p className="text-[28px] font-extrabold text-teal-600">{inProgress.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Delivered Today</p>
          <p className="text-[28px] font-extrabold text-gray-700">{completed.length}</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-400">No orders yet</p>
          <p className="text-[12px] text-gray-300 mt-1">New orders will appear here in real time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending ({pending.length})</p>
              {pending.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mt-4">Preparing ({inProgress.length})</p>
              {inProgress.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {completed.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-4">Delivered ({completed.length})</p>
              {completed.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GeneralVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50);
    setRequests((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Vendor Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Requests</p>
          <p className="text-[28px] font-extrabold text-teal-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Recent Requests</h3>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No requests yet.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(r => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{r.guest_name} — Room {r.room}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{r.type} · {r.details?.slice(0, 60)}{r.details?.length > 60 ? '…' : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Enhanced Staff View ─────────────────────────────────── */
function StaffView({ hotelId, hotelName, hotelSlug, staff, onRefresh }: { hotelId: string; hotelName: string; hotelSlug: string; staff: StaffAccount[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'staff', vendor_type: '', department: '', hire_date: '', min_hours: 0, employment_type: 'full_time' });
  const [editingPerms, setEditingPerms] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', department: '', hire_date: '', min_hours: 0, employment_type: 'full_time' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);
  const ALL_PERMS = ['orders', 'messages', 'shuttle', 'hotel', 'staff_mgmt', 'partners', 'qrcodes'];

  const handleResendInvite = async (s: StaffAccount) => {
    if (!s.email) return;
    setResendingId(s.id!);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'staff_invitation',
          data: {
            staffEmail: s.email,
            staffName: s.name,
            staffRole: s.role,
            hotelName,
            hotelSlug,
            pin: '',
            setupUrl: `${baseUrl}/staff/setup?email=${encodeURIComponent(s.email)}&hotel=${encodeURIComponent(hotelSlug)}&mode=setup`,
          },
        }),
      });
      setResentId(s.id!);
      setTimeout(() => setResentId(null), 3000);
    } catch {
      // ignore — admin can retry
    } finally {
      setResendingId(null);
    }
  };

  const adminFetch = async (action: string, body: any) => {
    const res = await fetch('/api/superadmin-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
      body: JSON.stringify({ action, data: body }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Request failed');
    return json;
  };

  const handleAdd = async () => {
    setSaveError('');
    if (!form.name) {
      setSaveError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await adminFetch('create_staff', {
        hotel_id: hotelId, name: form.name, role: form.role,
        email: form.email, phone: form.phone,
        permissions: form.role === 'vendor' ? [] : ['orders', 'messages', 'shuttle'],
        vendor_type: form.role === 'vendor' ? form.vendor_type || 'shuttle' : undefined,
        department: form.department || undefined,
        hire_date: form.hire_date || undefined,
        min_hours: Number(form.min_hours) || 0,
        employment_type: form.employment_type || 'full_time',
      });

      // Send invitation email with setup link
      if (form.email && sendInvite) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
          body: JSON.stringify({
            type: 'staff_invitation',
            data: {
              staffEmail: form.email,
              staffName: form.name,
              staffRole: form.role,
              hotelName,
              hotelSlug,
              pin: '',
              setupUrl: `${baseUrl}/staff/setup?email=${encodeURIComponent(form.email)}&hotel=${encodeURIComponent(hotelSlug)}&mode=setup`,
            },
          }),
        }).catch(() => {});
      }

      setForm({ name: '', email: '', phone: '', role: 'staff', vendor_type: '', department: '', hire_date: '', min_hours: 0, employment_type: 'full_time' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save staff';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openProfile = (s: StaffAccount) => {
    setProfileForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      department: s.department || '',
      hire_date: s.hire_date || '',
      min_hours: s.min_hours || 0,
      employment_type: s.employment_type || 'full_time',
    });
    setProfileError('');
    setEditingProfile(editingProfile === s.id ? null : s.id!);
  };

  const saveProfile = async (staffId: string) => {
    setProfileSaving(true);
    setProfileError('');
    try {
      await updateStaffDetails(staffId, {
        name: profileForm.name || undefined,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        department: profileForm.department || undefined,
        hire_date: profileForm.hire_date || undefined,
        min_hours: Number(profileForm.min_hours) || 0,
        employment_type: profileForm.employment_type || undefined,
      });
      setEditingProfile(null);
      onRefresh();
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePermToggle = async (staffId: string, perm: string, current: string[]) => {
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    await adminFetch('update_staff_permissions', { id: staffId, permissions: updated });
    onRefresh();
  };

  const handleToggleActive = async (s: StaffAccount) => {
    await adminFetch('update_staff', { id: s.id!, updates: { active: !s.active } });
    onRefresh();
  };

  const permLabels: Record<string, string> = {
    orders: 'Live Orders', messages: 'Guest Messages', shuttle: 'Shuttle Ops',
    hotel: 'Hotel Settings', staff_mgmt: 'Staff Mgmt', partners: 'Partners', qrcodes: 'QR Codes',
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Staff Management</h1>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-3">Add Staff Member</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="vendor">Vendor (external)</option>
                </select>
              </div>
            </div>
            {form.role === 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Vendor Type</label>
                <select value={form.vendor_type} onChange={e => setForm({ ...form, vendor_type: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-orange-200 text-[13px] outline-none">
                  <option value="shuttle">Shuttle Company</option>
                  <option value="taxi">Taxi / Rideshare</option>
                  <option value="tour">Tour Operator</option>
                  <option value="catering">Catering</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-[10px] text-orange-600 mt-1">Vendors only see their own manifest — no hotel data.</p>
              </div>
            )}
            {/* Position / Department */}
            {form.role !== 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Position / Department</label>
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="">— No position —</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Used for checklist filtering on the Dashboard.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@hotel.com"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="305-555-0100"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Hire Date</label>
              <input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">Used for PTO accrual calculations.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Min Weekly Hours</label>
                <input type="number" min={0} max={80} value={form.min_hours} onChange={e => setForm({ ...form, min_hours: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Employment Type</label>
                <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                </select>
              </div>
            </div>
            {saveError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button onClick={handleAdd} disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-50" style={{ backgroundColor: '#0D9488' }}>{saving ? 'Saving...' : 'ADD STAFF MEMBER'}</button>
            {form.email && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: '#0D9488' }} />
                <span className="text-[11px] text-gray-500">Send invitation email with setup link</span>
              </label>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-[15px]">Active Staff ({staff.filter(s => s.active).length})</h3></div>
          <div className="divide-y divide-gray-50">
            {staff.filter(s => s.active).length === 0 ? (
              <div className="px-5 py-6 text-center"><p className="text-[13px] text-gray-400">No staff accounts yet.</p></div>
            ) : staff.filter(s => s.active).map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{s.name}
                      <span className="text-[10px] text-gray-400 capitalize font-normal"> · {s.role}{s.vendor_type ? ` (${s.vendor_type})` : ''}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">{s.email}{s.email && s.phone ? ' · ' : ''}{s.phone} · PIN: ••••
                      {s.department && (
                        <span> · Position: {DEPARTMENTS.find(d => d.key === s.department)?.icon} {DEPARTMENTS.find(d => d.key === s.department)?.label || s.department}</span>
                      )}
                      {s.hire_date && <span> · Hired: {new Date(s.hire_date+'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>}
                      {s.hire_date && (() => {
                        const months = Math.floor((Date.now() - new Date(s.hire_date+'T00:00:00').getTime()) / (1000*60*60*24*30.44));
                        const ptoAccrued = Math.floor(months * 1.25); // ~15 days/year
                        return <span> · {ptoAccrued}PTO days</span>;
                      })()}
                      {(s.min_hours || s.employment_type) && (
                        <span> · {s.employment_type === 'part_time' ? 'Part-time' : 'Full-time'}{s.min_hours ? ` · ${s.min_hours}h/wk min` : ''}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openProfile(s)}
                      className={`text-[10px] font-bold px-2 py-1 rounded ${editingProfile === s.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Edit Profile</button>
                    <button onClick={() => setEditingPerms(editingPerms === s.id ? null : s.id!)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Permissions</button>
                    {s.email && (
                      <button onClick={() => handleResendInvite(s)} disabled={resendingId === s.id}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-teal-50 text-teal-700 disabled:opacity-50">
                        {resentId === s.id ? 'Sent!' : resendingId === s.id ? 'Sending...' : 'Resend Invite'}
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">Deactivate</button>
                    <button onClick={() => { if(confirm('Delete?')) { deleteStaffAccount(s.id!); onRefresh(); } }}
                      className="text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
                {editingProfile === s.id && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Edit Profile</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Name</label>
                        <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Position / Department</label>
                        <select value={profileForm.department} onChange={e => setProfileForm({...profileForm, department: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none">
                          <option value="">— No position —</option>
                          {DEPARTMENTS.map(d => (
                            <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Email</label>
                        <input value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Phone</label>
                        <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Hire Date</label>
                        <input type="date" value={profileForm.hire_date} onChange={e => setProfileForm({...profileForm, hire_date: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Min Hrs/Wk</label>
                        <input type="number" min={0} max={80} value={profileForm.min_hours} onChange={e => setProfileForm({...profileForm, min_hours: parseInt(e.target.value)||0})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Type</label>
                        <select value={profileForm.employment_type} onChange={e => setProfileForm({...profileForm, employment_type: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none">
                          <option value="full_time">Full Time</option>
                          <option value="part_time">Part Time</option>
                        </select>
                      </div>
                    </div>
                    {profileError && <p className="text-[11px] text-red-500">{profileError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => saveProfile(s.id!)} disabled={profileSaving}
                        className="px-4 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{backgroundColor: TEAL}}>
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditingProfile(null)} className="px-3 py-2 rounded-lg text-[12px] text-gray-500 font-semibold bg-white border border-gray-200">Cancel</button>
                    </div>
                  </div>
                )}
                {editingPerms === s.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_PERMS.map(p => {
                      const has = (s.permissions || []).includes(p);
                      return (
                        <button key={p} onClick={() => handlePermToggle(s.id!, p, s.permissions || [])}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${has ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{permLabels[p]}</button>
                      );
                    })}
                  </div>
                )}
                {editingDept === s.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <select value={editingDeptValue} onChange={e => setEditingDeptValue(e.target.value)}
                      className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 text-[12px] outline-none">
                      <option value="">— No position —</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                    <button onClick={async () => {
                      await updateStaffDetails(s.id!, { department: editingDeptValue });
                      setEditingDept(null);
                      onRefresh();
                    }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{backgroundColor: TEAL}}>Save</button>
                    <button onClick={() => setEditingDept(null)} className="text-[11px] text-gray-500 font-semibold px-2">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inactive staff */}
        {staff.filter(s => !s.active).length > 0 && (
          <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Inactive ({staff.filter(s => !s.active).length})</summary>
            <div className="space-y-2 mt-2">
              {staff.filter(s => !s.active).map(s => (
                <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                  <span className="text-gray-500">{s.name} · {s.role}</span>
                  <div className="flex items-center gap-2">
                    {s.email && (
                      <button onClick={() => handleResendInvite(s)} disabled={resendingId === s.id}
                        className="text-[10px] font-bold text-teal-600 disabled:opacity-50">
                        {resentId === s.id ? 'Sent!' : resendingId === s.id ? 'Sending...' : 'Resend Invite'}
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold text-emerald-600">Reactivate</button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ── Guest Home Preview ─────────────────────────────────── */
function GuestHomePreview({ color, hotelName }: { color: string; hotelName: string }) {
  const tiles = [
    { label: 'WELCOME', filled: true },
    { label: 'TRANSPORT', filled: false },
    { label: 'FACILITIES', filled: false },
    { label: 'MESSAGE', filled: false },
  ];
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 400 }}>
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[28px] border-[6px] border-gray-800 bg-[#F4F4F5] overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="bg-white px-3 pt-2 pb-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[9px] font-black text-black leading-none">Hello!</div>
              <div className="text-[6px] text-gray-400 mt-0.5">What do you need today?</div>
            </div>
            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        </div>
        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-1 p-1.5 h-[160px]">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl flex items-center justify-center text-[6px] font-bold tracking-wider"
              style={t.filled
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: 'white', color, border: '1px solid #e5e7eb' }}
            >
              {t.label}
            </div>
          ))}
        </div>
        {/* Rewards banner */}
        <div className="mx-1.5 rounded-xl overflow-hidden" style={{ height: 44, backgroundColor: color, opacity: 0.15 }}>
          <div className="flex items-end h-full px-2 pb-1">
            <span className="text-[6px] font-bold" style={{ color }}>BEST WESTERN REWARDS</span>
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex gap-1 p-1.5 mt-1" style={{ height: 70 }}>
          <div className="w-[38%] rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <span className="text-[5px] font-bold" style={{ color }}>NEARBY</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
              <span className="text-[5px] font-bold text-white">FOOD</span>
            </div>
            <div className="flex-1 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
              <span className="text-[5px] font-bold" style={{ color }}>REVIEW</span>
            </div>
          </div>
        </div>
        {/* Hotel name chip */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="px-2 py-0.5 rounded-full text-white text-[5px] font-bold" style={{ backgroundColor: color }}>
            {hotelName || 'Your Hotel'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hotel Settings View ────────────────────────────────── */
function QrCodesView({ hotelId, hotelSlug }: { hotelId: string; hotelSlug: string }) {
  const [codes, setCodes] = useState<QrCodeRow[]>([]);
  const [form, setForm] = useState({ label: '', location_type: 'room' });
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    const data = await getQrCodes(hotelId);
    setCodes(data);
  }, [hotelId]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getUrl = (label: string) => `${baseUrl}/?hotel=${hotelSlug}&room=${encodeURIComponent(label)}`;

  const handleAdd = async () => {
    if (!form.label) return;
    const url = getUrl(form.label);
    await createQrCode(hotelId, form.label, form.location_type, url);
    setForm({ label: '', location_type: 'room' });
    loadCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this QR code?')) return;
    await deleteQrCode(id);
    loadCodes();
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">QR Codes</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Generate QR codes for each room or location. Guests scan to open the app pre-filled with their info.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-2">Batch Generate from Room Database</h3>
        <p className="text-[12px] text-gray-400 mb-3">
          Uses your actual room list from Room Management. Only rooms without QR codes are generated.
        </p>
        <div className="flex gap-3 mb-4">
          <div className="flex items-end">
            <button
              onClick={async () => {
                const rooms = await getAllHotelRooms(hotelId);
                if (!rooms || rooms.length === 0) return alert('No rooms in database. Upload room numbers in Room Management first.');
                let count = 0;
                let skipped = 0;
                for (const room of rooms) {
                  const label = room.room_number;
                  const exists = codes.some(c => c.label === label);
                  if (!exists) {
                    await createQrCode(hotelId, label, 'room', getUrl(label));
                    count++;
                  } else {
                    skipped++;
                  }
                }
                alert(`✅ Generated ${count} QR codes from ${rooms.length} rooms (${skipped} already existed, skipped)`);
                loadCodes();
              }}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px] whitespace-nowrap"
              style={{ backgroundColor: TEAL }}
            >
              Generate from Room DB ({codes.filter(c => c.location_type === 'room').length} existing)
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-bold text-[14px] mb-4">Generate Single QR Code</h3>
          <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Label (room # or location name)" value={form.label} onChange={v => setForm({ ...form, label: v })} placeholder="205 or Pool Deck" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Type</label>
            <select value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
              {['room', 'lobby', 'pool', 'elevator', 'restaurant', 'gym', 'spa'].map(lt => (
                <option key={lt} value={lt} className="capitalize">{lt.charAt(0).toUpperCase() + lt.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              Generate
            </button>
          </div>
        </div>
        </div>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <QrCodeIcon size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No QR codes yet. Generate your first above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {codes.map(code => {
            const url = code.url || getUrl(code.label);
            const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
            return (
              <div key={code.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex gap-4">
                  <Image src={qrImgUrl} alt={`QR for ${code.label}`} width={80} height={80} className="rounded-lg border border-gray-100 shrink-0" unoptimized />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-bold text-[15px] text-gray-900">{code.label}</p>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize mt-0.5">
                          {code.location_type}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(code.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 break-all mt-2 line-clamp-2">{url}</p>
                    <button
                      onClick={() => handleCopy(url, code.id)}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                    >
                      {copied === code.id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy URL</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Properties View ──────────────────────────────────────── */
function PropertiesView({ onSwitchHotel }: { onSwitchHotel: (slug: string) => void }) {
  const [hotels, setHotels] = useState<{ id: string; slug: string; name: string; brand: string }[]>([]);
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', propertyType: 'Hotel' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const adminFetch = async (action: string, body: any) => {
    const res = await fetch('/api/superadmin-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
      body: JSON.stringify({ action, data: body }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Request failed');
    return json;
  };

  useEffect(() => {
    adminFetch('list_hotels', {}).then(json => setHotels(json.hotels || [])).catch(() => {});
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getGuestUrl = (slug: string) => `${baseUrl}/?hotel=${slug}`;
  const getAdminUrl = (slug: string) => `${baseUrl}/staff?hotel=${slug}`;

  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    try {
      const json = await adminFetch('create_hotel', {
        slug: form.slug, name: form.name, adminEmail: form.adminEmail || undefined, propertyType: form.propertyType,
      });
      const hotel = json.hotel;
      if (form.adminEmail && hotel) {
        const origin = window.location.origin;
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
          body: JSON.stringify({
            type: 'tenant_onboarding',
            data: {
              hotelName: form.name,
              slug: form.slug,
              adminEmail: form.adminEmail,
              guestUrl: `${origin}/?hotel=${form.slug}`,
              adminUrl: `${origin}/staff?hotel=${form.slug}`,
            },
          }),
        });
      }
      setForm({ slug: '', name: '', adminEmail: '', propertyType: 'Hotel' });
      const refreshed = await adminFetch('list_hotels', {});
      setHotels(refreshed.hotels || []);
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : '') || (typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '');
      alert(msg.includes('unique') || msg.includes('duplicate') ? 'Slug already in use. Try a different one.' : msg || 'Failed to create hotel. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">All Properties</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{hotels.length} propert{hotels.length !== 1 ? 'ies' : 'y'} on this platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-4">Create New Property</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Property Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Miami Airport Hotel" />
          <Field label="URL Slug *" value={form.slug} onChange={v => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, '-') })} placeholder="miami-airport" />
          <div className="col-span-2">
            <Field label="Admin Email (optional — for onboarding email)" value={form.adminEmail} onChange={v => setForm({ ...form, adminEmail: v })} placeholder="manager@property.com" />
          </div>
          <div className="col-start-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Property Type</label>
            <select
              value={form.propertyType}
              onChange={e => setForm({ ...form, propertyType: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
              <option value="Hotel">Hotel</option>
              <option value="Short-Term Rental">Short-Term Rental</option>
              <option value="Motel">Motel</option>
              <option value="Vacation Rental">Vacation Rental</option>
              <option value="Boutique Stay">Boutique Stay</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        {form.slug && (
          <p className="text-[11px] text-gray-400 mb-3 font-mono">Guest URL preview: {getGuestUrl(form.slug)}</p>
        )}
        <button onClick={handleCreate} disabled={creating}
          className="px-6 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60" style={{ backgroundColor: TEAL }}>
          {creating ? 'Creating...' : 'CREATE PROPERTY'}
        </button>
      </div>

      <div className="space-y-4">
        {hotels.map(hotel => {
          const guestUrl = getGuestUrl(hotel.slug);
          const adminUrl = getAdminUrl(hotel.slug);
          return (
            <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-extrabold text-[16px] text-gray-900">{hotel.name}</p>
                    <p className="text-[12px] text-gray-400 font-mono mt-0.5">@{hotel.slug}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 mt-1"
                    style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    {hotel.brand || 'Hotel'}
                  </span>
                </div>
                <button onClick={() => onSwitchHotel(hotel.slug)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Manage
                </button>
              </div>

              <div className="space-y-2">
                {([
                  { label: 'Guest App URL', url: guestUrl, id: hotel.id + '-guest', note: 'Share with guests or embed in QR code' },
                  { label: 'Admin / Staff URL', url: adminUrl, id: hotel.id + '-admin', note: 'Send to hotel admin • Admin PIN: 2025' },
                ] as const).map(({ label, url, id, note }) => (
                  <div key={id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-[12px] text-gray-700 font-mono truncate mt-0.5">{url}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>
                    </div>
                    <button onClick={() => handleCopy(url, id)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      {copied === id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shared UI Helpers ──────────────────────────────────── */
function Section({ title, Icon, children }: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} style={{ color: TEAL }} />
        <h3 className="font-bold text-[14px]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      />
    </div>
  );
}
const KB_CATEGORIES = ['General', 'WiFi & Tech', 'Amenities', 'Transport', 'Food & Dining', 'Check-in / Check-out', 'Safety', 'Local Area', 'Incidents', 'SOP', 'System Guide', 'Tenant Onboarding'];

function KnowledgeBaseView({ hotelId }: { hotelId: string }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ category: 'General', question: '', answer: '', keywords: '', source_url: '' });
  const [saving, setSaving] = useState(false);

  // URL import state
  const [importUrl, setImportUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);

  // PDF upload state
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setEntries(await getAllKnowledgeBase(hotelId));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ category: 'General', question: '', answer: '', keywords: '', source_url: '' }); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const sourceUrl = form.source_url.trim() || undefined;
    if (editingId) {
      await updateKnowledgeEntry(editingId, { category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords, source_url: sourceUrl });
    } else {
      await createKnowledgeEntry({ hotel_id: hotelId, category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords, source_url: sourceUrl });
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (e: KnowledgeEntry) => {
    setForm({ category: e.category, question: e.question, answer: e.answer, keywords: (e.keywords || []).join(', '), source_url: e.source_url || '' });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await deleteKnowledgeEntry(id);
    await load();
  };

  const handleToggle = async (e: KnowledgeEntry) => {
    await updateKnowledgeEntry(e.id, { active: !e.active });
    await load();
  };

  // ── URL Import ──────────────────────────────────────────
  const handleImportUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) { alert('Please enter a valid URL (starting with http:// or https://)'); return; }
    setImportingUrl(true);
    try {
      const res = await fetch(url);
      const html = await res.text();
      // Extract <title> for the question
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;
      // Try to extract body text for answer
      let bodyText = '';
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        bodyText = bodyMatch[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3000);
      }
      const answer = bodyText || 'Source URL — content could not be extracted.';
      setForm({
        category: 'General',
        question: title,
        answer,
        keywords: '',
        source_url: url,
      });
      setEditingId(null);
      setShowForm(true);
      setImportUrl('');
    } catch {
      alert('Failed to fetch URL. Check that the URL is accessible and try again.');
    }
    setImportingUrl(false);
  };

  // ── PDF Import ──────────────────────────────────────────
  const handlePdfFile = async (file: File) => {
    if (file.type !== 'application/pdf') { alert('Please upload a .pdf file.'); return; }
    setUploadFileName(file.name);
    setUploadingPdf(true);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fullText += content.items.map((item: any) => (item as any).str).join(' ') + '\n';
      }
      const trimmed = fullText.trim().substring(0, 3000);
      const topic = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      setForm({
        category: 'General',
        question: `From document: ${topic}`,
        answer: trimmed || '(No extractable text found in PDF)',
        keywords: '',
        source_url: '',
      });
      setEditingId(null);
      setShowForm(true);
    } catch {
      alert('Failed to parse PDF. The file may be corrupted or protected.');
    }
    setUploadingPdf(false);
  };

  const usedCategories = ['All', ...Array.from(new Set(entries.map(e => e.category)))];
  const visible = entries.filter(e => {
    const catOk = filterCat === 'All' || e.category === filterCat;
    const searchOk = !search || e.question.toLowerCase().includes(search.toLowerCase()) || e.answer.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const grouped: Record<string, KnowledgeEntry[]> = {};
  visible.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-gray-900">Knowledge Base</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage Q&A that the chatbot uses to answer guests automatically</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-sm"
          style={{ backgroundColor: TEAL }}>
          <Plus size={15} /> Add Entry
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px]">{editingId ? 'Edit Entry' : 'New Knowledge Entry'}</h3>
            <button onClick={resetForm}><XIcon size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none">
                {KB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Question / Topic</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="e.g. What time is breakfast served?"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Answer</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="e.g. Complimentary breakfast is served 6:30 AM – 9:30 AM daily in the lobby."
                rows={3}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Keywords (comma-separated, optional)</label>
              <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="e.g. breakfast, food, morning, eat"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
              <p className="text-[11px] text-gray-400 mt-1">Helps the chatbot match guest messages more accurately</p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Source URL (optional)</label>
              <input value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                placeholder="https://example.com/page-with-info"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
              <p className="text-[11px] text-gray-400 mt-1">Where this information was sourced from</p>
            </div>
          </div>

          {/* Quick Import Tools */}
          <div className="flex items-center gap-3 pt-1 pb-2">
            {/* Import from URL */}
            <div className="flex items-center gap-2 flex-1">
              <input value={importUrl} onChange={e => setImportUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 text-[13px] outline-none" />
              <button onClick={handleImportUrl} disabled={importingUrl || !importUrl.trim()}
                className="shrink-0 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[12px] disabled:opacity-40 hover:bg-indigo-100 transition-colors">
                {importingUrl ? 'Fetching…' : 'Import URL'}
              </button>
            </div>
            {/* Upload PDF */}
            <label className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-[12px] cursor-pointer hover:bg-amber-100 transition-colors">
              <Upload size={14} />
              {uploadingPdf ? 'Parsing…' : uploadFileName ? uploadFileName.replace(/^.{20}.*$/, m => m.substring(0,20)+'…') : 'Upload PDF'}
              <input type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ''; }} />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.question.trim() || !form.answer.trim()}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Knowledge Base'}
            </button>
            <button onClick={resetForm} className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-[14px]">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Entries', count: entries.length, color: 'text-gray-800' },
          { label: 'Active', count: entries.filter(e => e.active).length, color: 'text-emerald-600' },
          { label: 'Categories', count: new Set(entries.map(e => e.category)).size, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p>
            <p className={`text-[26px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search questions & answers…"
          className="flex-1 min-w-[200px] bg-white rounded-xl px-3.5 py-2 border border-gray-200 text-[13px] outline-none" />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {usedCategories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${filterCat === c ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
              style={filterCat === c ? { backgroundColor: TEAL } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: TEAL }} /></div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-500">No entries yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Add Q&A pairs to help the chatbot answer guests automatically</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map(entry => (
                  <div key={entry.id} className={`bg-white rounded-xl border p-4 shadow-sm transition-opacity ${entry.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900 mb-1">{entry.question}</p>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{entry.answer}</p>
                        {entry.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.keywords.map((k, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">{k}</span>
                            ))}
                          </div>
                        )}
                        {entry.source_url && (
                          <a href={entry.source_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[12px] text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            <ExternalLink size={12} />
                            {entry.source_url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggle(entry)} title={entry.active ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${entry.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {entry.active ? <Check size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => handleEdit(entry)}
                          className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(entry.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Guests View ──────────────────────────────────────── */
interface GuestSessionData {
  name: string;
  room: string;
  checkout: string;
  checkedIn: string;
  validationStatus?: 'pending' | 'confirmed';
  validatedAt?: string;
  lastSeen?: string;
}

function GuestsView({ hotelId }: { hotelId: string }) {
  const [guests, setGuests] = useState<GuestSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  const loadGuests = useCallback(async () => {
    const guestList: GuestSessionData[] = [];

    // Fetch from database (guests table)
    try {
      const dbGuests = await getGuestValidations(hotelId);
      dbGuests.forEach(g => {
        guestList.push({
          name: g.name,
          room: g.room,
          checkout: '',
          checkedIn: g.validatedAt,
          validationStatus: 'confirmed',
          validatedAt: g.validatedAt,
          lastSeen: g.validatedAt,
        });
      });
    } catch (err) {
      console.error('Error loading guest validations from DB:', err);
    }

    // Also check localStorage for current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        const existing = guestList.findIndex(g => g.name === session.name && g.room === session.room);
        if (existing >= 0) {
          // Merge — localStorage session may have a more recent validation status
          if (session.validationStatus === 'confirmed') {
            guestList[existing].validationStatus = 'confirmed';
            guestList[existing].validatedAt = session.validatedAt || guestList[existing].validatedAt;
          }
        } else {
          guestList.push({
            name: session.name,
            room: session.room,
            checkout: session.checkout || '',
            checkedIn: session.checkedIn || '',
            validationStatus: session.validationStatus || 'pending',
            validatedAt: session.validatedAt,
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error parsing guest session:', err);
      }
    }

    // Also get guests from recent requests
    try {
      const { data } = await supabase
        .from('requests')
        .select('guest_name, room')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        data.forEach((r: { guest_name: string; room: string }) => {
          const existing = guestList.findIndex(g => g.name === r.guest_name && g.room === r.room);
          if (existing < 0) {
            guestList.push({
              name: r.guest_name,
              room: r.room,
              checkout: '',
              checkedIn: '',
              validationStatus: 'pending',
              lastSeen: new Date().toISOString(),
            });
          }
        });
      }
    } catch (err) {
      console.error('Error loading guests from requests:', err);
    }

    setGuests(guestList);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    loadGuests();
    // Subscribe to localStorage changes for real-time updates
    const handleStorage = () => loadGuests();
    window.addEventListener('storage', handleStorage);
    // Poll for updates every 5 seconds
    const interval = setInterval(loadGuests, 5000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [loadGuests]);

  const confirmGuest = async (guest: GuestSessionData) => {
    // Write to database so it persists across devices
    if (hotelId) {
      try {
        await upsertGuestValidation(hotelId, guest.name, guest.room, new Date().toISOString());
      } catch (err) {
        console.error('Error writing guest validation to DB:', err);
      }
    }
    // Update localStorage if it's the current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.name === guest.name && session.room === guest.room) {
          session.validationStatus = 'confirmed';
          session.validatedAt = new Date().toISOString();
          localStorage.setItem('guestSession', JSON.stringify(session));
          // Broadcast to other tabs
          window.dispatchEvent(new StorageEvent('storage'));
        }
      } catch (err) {
        console.error('Error confirming guest:', err);
      }
    }
    loadGuests();
  };

  const filteredGuests = guests.filter(g => {
    if (filter === 'pending') return g.validationStatus !== 'confirmed';
    if (filter === 'confirmed') return g.validationStatus === 'confirmed';
    return true;
  });

  const confirmedCount = guests.filter(g => g.validationStatus === 'confirmed').length;
  const pendingCount = guests.length - confirmedCount;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Guest Check-ins</h1>
        <button onClick={loadGuests} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Guests</p>
          <p className="text-[28px] font-extrabold text-gray-900">{guests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-emerald-500 uppercase font-bold">Confirmed</p>
          <p className="text-[28px] font-extrabold text-emerald-600">{confirmedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'confirmed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              filter === f
                ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Guests' : f === 'pending' ? 'Pending' : 'Confirmed'}
          </button>
        ))}
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Users size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">No guests found.</p>
          </div>
        ) : (
          filteredGuests.map((guest, i) => (
            <div
              key={`${guest.name}-${guest.room}-${i}`}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                guest.validationStatus === 'confirmed'
                  ? 'border-gray-200'
                  : 'border-l-4 border-l-amber-400 border-r border-t border-b border-amber-100 animate-pulse'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      guest.validationStatus === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                      guest.validationStatus === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {guest.validationStatus === 'confirmed' ? 'Validated' : 'Pending Validation'}
                    </span>
                  </div>
                  <p className="text-[16px] font-bold text-gray-900">{guest.name}</p>
                  <p className="text-[13px] text-gray-500">Room {guest.room}</p>
                  {guest.checkout && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Checkout: {new Date(guest.checkout).toLocaleDateString()}
                    </p>
                  )}
                  {guest.validatedAt && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Confirmed at {new Date(guest.validatedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {guest.validationStatus !== 'confirmed' ? (
                    <button
                      onClick={() => confirmGuest(guest)}
                      className="px-4 py-2 rounded-lg text-white text-[12px] font-bold bg-emerald-500 hover:bg-emerald-600 transition-colors"
                    >
                      Confirm Guest
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-bold">
                      ✓ Confirmed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[13px] text-amber-800">
          <strong>Note:</strong> Since PMS integration is not yet active, guests show as &quot;Pending&quot; until manually confirmed by staff.
          Guests can still use the app while pending, but they will need to validate before placing orders or booking transport.
        </p>
      </div>
    </div>
  );
}

/* ── Rooms View (Bulk upload + management) ───────────────── */
/* ── Front Desk View ──────────────────────────────────── */
function PropertyInfoView({ config }: { config: HotelConfig }) {
  const items = [
    { label: 'Property Name', value: config.name, icon: HotelIcon },
    { label: 'Manager', value: config.managerName, icon: Users },
    { label: 'Address', value: config.address, icon: MapPin },
    { label: 'Front Desk Phone', value: config.frontDeskPhone, icon: Phone },
    { label: 'WiFi Network', value: config.wifiName, icon: Wifi },
    { label: 'WiFi Password', value: config.wifiPassword, icon: Lock },
    { label: 'Website', value: config.websiteUrl, icon: ExternalLink, link: true },
  ].filter(i => i.value);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-[22px] font-extrabold text-gray-900 mb-1">Property Info</h1>
      <p className="text-[13px] text-gray-500 mb-6">Quick reference for {config.name}</p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}15` }}>
              <item.icon size={18} style={{ color: TEAL }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
              {item.link ? (
                <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-blue-600 hover:underline break-all">{item.value}</a>
              ) : (
                <p className="text-[14px] font-semibold text-gray-900 break-all">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Week helpers
function getWeekStart(date: string, weekStartsOn?: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  if (weekStartsOn === 'Monday') {
    const monOffset = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - monOffset);
  } else {
    d.setDate(d.getDate() - day);
  }
  return d.toISOString().split('T')[0];
}
function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function dayName(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}
function dayMonth(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}
function formatDateRange(a: string, b: string): string {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return `${da.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${db.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// Default coverage rules used by the forecast form
const DEFAULT_COVERAGE_RULES: CoverageRule[] = [
  { department: 'front_desk',   position: 'Front Desk Agent',  ratio: 30, min_staff: 1, max_staff: 4, start_time: '07:00', end_time: '23:00' },
  { department: 'housekeeping', position: 'Housekeeper',       ratio: 15, min_staff: 2, max_staff: 8, start_time: '08:00', end_time: '16:00' },
  { department: 'maintenance',  position: 'Maintenance Tech',  ratio: 50, min_staff: 1, max_staff: 3, start_time: '08:00', end_time: '17:00' },
  { department: 'security',     position: 'Security Officer',  ratio: 60, min_staff: 1, max_staff: 2, start_time: '22:00', end_time: '06:00' },
  { department: 'drivers',      position: 'Shuttle Driver',    ratio: 40, min_staff: 0, max_staff: 3, start_time: '06:00', end_time: '22:00' },
  { department: 'management',   position: 'Manager on Duty',   ratio: 80, min_staff: 1, max_staff: 2, start_time: '08:00', end_time: '20:00' },
];

/* ── Checklists Tab View ─────────────────────────────── */
function ChecklistsTabView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [templates, setTemplates] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<DepartmentKey>('front_desk');
  const [openDept, setOpenDept] = useState<DepartmentKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [t, i] = await Promise.all([getChecklists(hotelId), getChecklistInstances(hotelId)]);
    setTemplates(t || []);
    setInstances(i || []);
  };
  useEffect(() => { load(); }, [hotelId]);

  const today = new Date().toISOString().split('T')[0];

  const create = async () => {
    if (!newName.trim()) return;
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.from('staff_checklists').insert({
      hotel_id: hotelId,
      name: newName.trim(),
      items: [],
      department: newDept,
      is_active: true,
      assigned_role: 'staff',
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    setNewName(''); setNewDept('front_desk'); setShowNew(false);
    await load();
    setSubmitting(false);
  };

  const startInstance = async (templateId: string) => {
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.from('staff_checklist_instances').insert({
      checklist_id: templateId,
      hotel_id: hotelId,
      staff_name: sessionStorage.getItem('attenda_session_name') || 'Staff',
      shift_date: today,
      checked_items: [],
      completed: false,
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    await load();
    setSubmitting(false);
  };

  const toggleItem = async (instanceId: string, itemId: string, currentlyChecked: boolean) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const newChecked = currentlyChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const tpl = templates.find(t => t.id === inst.checklist_id);
    const completed = newChecked.length === (tpl?.items.length || 0);
    await supabase.from('staff_checklist_instances').update({
      checked_items: newChecked,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', instanceId);
    await load();
  };

  const removeTemplate = async (id: string) => {
    if (!confirm('Delete this checklist template?')) return;
    await deleteChecklist(id);
    load();
  };

  // Build a map of templates by department
  const templatesByDept: Record<string, Checklist[]> = {};
  templates.filter(t => t.is_active !== false).forEach(t => {
    const k = t.department || 'front_desk';
    (templatesByDept[k] = templatesByDept[k] || []).push(t);
  });

  // Today's instance per template (most recent if multiple)
  const todaysInstanceFor = (templateId: string) =>
    instances
      .filter(i => i.checklist_id === templateId && i.shift_date === today)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Checklists</h1>
          <p className="text-[13px] text-gray-500">Today&apos;s tasks by department</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Department sections — click to expand and see today's checklist */}
      <div className="space-y-3">
        {DEPARTMENTS.map(dept => {
          const deptTemplates = templatesByDept[dept.key] || [];
          const open = openDept === dept.key;
          return (
            <div key={dept.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenDept(open ? null : dept.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{dept.icon}</span>
                  <div className="text-left">
                    <p className="text-[14px] font-bold text-gray-900">{dept.label}</p>
                    <p className="text-[11px] text-gray-500">
                      {deptTemplates.length} checklist{deptTemplates.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {deptTemplates.length === 0 ? (
                    <p className="text-[12px] text-gray-400 px-4 py-4">No checklists for {dept.label} yet. {isAdmin ? 'Create one above.' : 'Ask your manager to add one.'}</p>
                  ) : (
                    deptTemplates.map(tpl => {
                      const inst = todaysInstanceFor(tpl.id);
                      const totalItems = tpl.items?.length || 0;
                      const doneCount = inst?.checked_items.length || 0;
                      return (
                        <div key={tpl.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-[14px] font-semibold text-gray-900">{tpl.name}</p>
                              <p className="text-[11px] text-gray-500">
                                {totalItems} item{totalItems === 1 ? '' : 's'}
                                {inst ? ` · ${doneCount}/${totalItems} done` : ' · not started'}
                              </p>
                            </div>
                            {isAdmin ? (
                              <button onClick={() => removeTemplate(tpl.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                <Trash2 size={14} />
                              </button>
                            ) : !inst && totalItems > 0 ? (
                              <button onClick={() => startInstance(tpl.id)} disabled={submitting} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                Start
                              </button>
                            ) : inst?.completed ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>
                            ) : inst ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                            ) : null}
                          </div>

                          {/* Progress bar */}
                          {inst && totalItems > 0 && (
                            <div className="bg-gray-100 rounded-full h-1.5 mb-3">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / totalItems) * 100}%`, backgroundColor: TEAL }} />
                            </div>
                          )}

                          {/* Items — only show for staff once they start the checklist, or for admin always */}
                          {(inst || isAdmin) && totalItems > 0 && (
                            <div className="space-y-1">
                              {tpl.items.map(item => {
                                const isChecked = !!inst?.checked_items.find(x => x.item_id === item.id);
                                return (
                                  <label key={item.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => inst && toggleItem(inst.id, item.id, isChecked)}
                                      disabled={!inst || submitting}
                                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                      style={{ accentColor: TEAL }}
                                    />
                                    <span className={`text-[13px] ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                      {item.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Admin: no-instance preview of items */}
                          {!inst && isAdmin && totalItems > 0 && (
                            <p className="text-[11px] text-gray-400 mt-1">Staff will start and check these off as they work.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin: new checklist template modal */}
      {showNew && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">New Checklist Template</h2>
              <button onClick={() => setShowNew(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Name the checklist and pick a department. Add items next (one per line).</p>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Morning Room Check" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" autoFocus />
              <select value={newDept} onChange={e => setNewDept(e.target.value as DepartmentKey)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100">
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
              </select>
              <div className="flex gap-2 pt-1">
                <button onClick={create} disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{submitting ? 'Saving…' : 'Create'}</button>
                <button onClick={() => setShowNew(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddGuestToSlot({ slotId, routeName, onDone }: { slotId: string; routeName: string; onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ guest_name: '', room_number: '', pax: '1', notes: '' });
  const [saving, setSaving] = useState(false);
  if (!show) return (
    <button onClick={() => setShow(true)} className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-800">
      + Add Guest (walk-up)
    </button>
  );
  const save = async () => {
    if (!form.guest_name) return;
    setSaving(true);
    await bookShuttleSlot({ slot_id: slotId, guest_name: form.guest_name, room_number: form.room_number, pax: parseInt(form.pax) || 1, notes: form.notes });
    setForm({ guest_name: '', room_number: '', pax: '1', notes: '' });
    setShow(false);
    onDone();
    setSaving(false);
  };
  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
      <p className="text-[10px] font-bold text-gray-500">Add Guest to {routeName}</p>
      <input placeholder="Guest name" value={form.guest_name} onChange={e => setForm(f => ({...f, guest_name: e.target.value}))} className="w-full text-[11px] border rounded px-2 py-1" />
      <div className="flex gap-1">
        <input placeholder="Room" value={form.room_number} onChange={e => setForm(f => ({...f, room_number: e.target.value}))} className="w-20 text-[11px] border rounded px-2 py-1" />
        <input placeholder="Pax" type="number" value={form.pax} onChange={e => setForm(f => ({...f, pax: e.target.value}))} className="w-16 text-[11px] border rounded px-2 py-1" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setShow(false)} className="text-[11px] text-gray-500">Cancel</button>
        <button onClick={save} disabled={saving} className="text-[11px] font-bold text-teal-600">{saving ? 'Saving…' : 'Add'}</button>
      </div>
    </div>
  );
}

/* ── Learning View ───────────────────────────────────── */
/* ── Learning & HR (combined) ─────────────────────────── */
function ShuttleScheduleView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [slots, setSlots] = useState<(OpsShuttleSlot & { id: string })[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [form, setForm] = useState<{ day_of_week: number; departure_time: string; pickup_location: string; destination: string; service_type: 'regular' | 'express'; capacity: number; notes: string }>({ day_of_week: 1, departure_time: '08:00', pickup_location: '', destination: '', service_type: 'regular', capacity: 12, notes: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, c] = await Promise.all([listShuttleSlots(hotelId), getHotelConfig(hotelId)]);
      setSlots(s || []);
      setConfig(c);
      setLoading(false);
    })();
  }, [hotelId]);

  const save = async () => {
    if (!form.pickup_location) return;
    try {
      await createOps(hotelId, 'shuttle_slot', form, 'active', { guest_name: 'Admin', room: 'SHUTTLE' });
      const s = await listShuttleSlots(hotelId);
      setSlots(s || []);
      setShowAdd(false);
      setForm({ day_of_week: 1, departure_time: '08:00', pickup_location: '', destination: '', service_type: 'regular', capacity: 12, notes: '' });
    } catch {
      alert('Failed to save shuttle slot');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    await deleteOps(id);
    setSlots(slots.filter(s => s.id !== id));
  };

  const generateMonth = async () => {
    if (!config?.hasFreeShuttle) {
      setGenResult('Free shuttle is not enabled. Turn it on in Property Settings first.');
      return;
    }
    const startTime = config.shuttleStartTime?.slice(0, 5);
    const endTime = config.shuttleEndTime?.slice(0, 5);
    if (!startTime || !endTime) {
      setGenResult('Set shuttle start and end times in Property Settings first.');
      return;
    }
    if (!config.shuttleDays || config.shuttleDays.length === 0) {
      setGenResult('Set shuttle days in Property Settings first.');
      return;
    }
    setGenerating(true);
    setGenResult(null);
    try {
      const [year, month] = genMonth.split('-').map(Number);
      const startMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endMin = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      const lastDay = new Date(year, month, 0).getDate();
      let created = 0;
      let skipped = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dt = new Date(year, month - 1, d);
        const dow = dt.getDay(); // 0=Sun..6=Sat
        // Convert 0-6 to our schedule's day_of_week convention (this view uses 0=Sun..6=Sat, matching Date.getDay)
        if (!config.shuttleDays.includes(dow)) { skipped++; continue; }
        for (let m = startMin; m <= endMin; m += 60) {
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          // Skip if a slot for this day+time already exists
          const exists = slots.some(s => s.day_of_week === dow && s.departure_time === `${hh}:${mm}:00`);
          if (exists) { skipped++; continue; }
          await createOps(hotelId, 'shuttle_slot', {
            day_of_week: dow,
            departure_time: `${hh}:${mm}:00`,
            pickup_location: config.shuttlePickupLocation || 'Hotel lobby',
            destination: 'Airport',
            service_type: 'regular',
            capacity: config.shuttleCapacity || 8,
            notes: '',
          }, 'active', { guest_name: 'Admin', room: 'SHUTTLE' });
          created++;
        }
      }
      const refreshed = await listShuttleSlots(hotelId);
      setSlots(refreshed || []);
      setGenResult(`Created ${created} slots for ${genMonth}${skipped ? `, skipped ${skipped} duplicates or off-days` : ''}.`);
    } catch (e: any) {
      setGenResult(`Failed: ${e?.message || 'unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SERVICE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    regular: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300' },
    express: { bg: 'bg-gray-900', text: 'text-white', ring: 'ring-gray-700' },
  };

  // Build unique time-slot rows
  const allTimes = Array.from(new Set(slots.map(s => s.departure_time))).sort();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">Shuttle Schedule</h1>
          <p className="text-[12px] text-gray-500">Free pickup and drop-off times</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowGenerate(true)} disabled={!config?.hasFreeShuttle} className="px-3 py-2 rounded-xl bg-gray-900 text-white font-bold text-[12px] flex items-center gap-1 disabled:opacity-40" title={!config?.hasFreeShuttle ? 'Enable free shuttle in Property Settings first' : 'Auto-fill the month'}>
              <CalendarDays size={14} /> Generate Month
            </button>
            <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl text-white font-bold text-[12px] flex items-center gap-1" style={{ backgroundColor: TEAL }}>
              <Plus size={14} /> Add Slot
            </button>
          </div>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Bus size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No shuttle slots configured</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Tap "Add Slot" to build the weekly grid</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left p-2 font-bold text-gray-500 uppercase text-[10px] min-w-[80px]">Time</th>
                  {DAYS.map(d => <th key={d} className="text-center p-2 font-bold text-gray-500 uppercase text-[10px] min-w-[110px]">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {allTimes.map(time => (
                  <tr key={time} className="border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-white p-2 font-bold text-gray-700 text-[11px]">{time}</td>
                    {DAYS.map((_, dayIdx) => {
                      const cellSlots = slots.filter(s => s.day_of_week === dayIdx && s.departure_time === time);
                      return (
                        <td key={dayIdx} className="p-1 align-top">
                          {cellSlots.map(s => {
                            const c = SERVICE_COLORS[s.service_type] || SERVICE_COLORS.regular;
                            return (
                              <div key={s.id} className={`${c.bg} ${c.text} rounded-lg p-1.5 mb-1 ring-1 ${c.ring} relative group`}>
                                <p className="font-bold text-[10px] leading-tight">{s.pickup_location}</p>
                                {s.notes && <p className="text-[9px] opacity-80 leading-tight mt-0.5">→ {s.notes}</p>}
                                {isAdmin && (
                                  <button onClick={() => del(s.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px]">×</button>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 ring-1 ring-gray-300"></span><span className="text-gray-600">Regular</span></span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-900 ring-1 ring-gray-700"></span><span className="text-gray-600">Express</span></span>
          </div>
        </div>
      )}

      {showAdd && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-4">New Shuttle Slot</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Day</label>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => setForm(p => ({ ...p, day_of_week: i }))} className={`py-2 rounded-lg text-[10px] font-bold ${form.day_of_week === i ? 'text-white' : 'bg-gray-100 text-gray-600'}`} style={form.day_of_week === i ? { backgroundColor: TEAL } : {}}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Departure Time</label>
                <input type="time" value={form.departure_time} onChange={e => setForm(p => ({ ...p, departure_time: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
              </div>
              <input value={form.pickup_location} onChange={e => setForm(p => ({ ...p, pickup_location: e.target.value }))} placeholder="Pickup location (e.g. Hotel lobby)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="Destination (e.g. MIA Airport)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Service</label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {(['regular', 'express'] as const).map(t => (
                      <button key={t} onClick={() => setForm(p => ({ ...p, service_type: t }))} className={`py-2 rounded-xl text-[11px] font-bold border capitalize ${form.service_type === t ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={form.service_type === t ? { backgroundColor: TEAL } : {}}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Capacity</label>
                  <input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
                </div>
              </div>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes (optional)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="flex gap-2 pt-2">
                <button onClick={save} disabled={!form.pickup_location} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>Save</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGenerate && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => { setShowGenerate(false); setGenResult(null); }}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-1">Generate Month of Shuttle Slots</h2>
            <p className="text-[11px] text-gray-500 mb-4">
              Auto-fills every {config?.shuttleDays && config.shuttleDays.length < 7 ? 'selected ' : ''}day from {config?.shuttleStartTime?.slice(0, 5) || '—'} to {config?.shuttleEndTime?.slice(0, 5) || '—'} on the hour. Uses {config?.shuttlePickupLocation || 'Hotel lobby'} → Airport, capacity {config?.shuttleCapacity || 8}. Existing slots are kept; duplicates are skipped.
            </p>

            <label className="text-[10px] font-bold text-gray-500 uppercase">Month</label>
            <input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1 mb-4" />

            {genResult && (
              <div className="bg-gray-50 rounded-xl p-3 text-[12px] text-gray-700 mb-3">
                {genResult}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={generateMonth} disabled={generating} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                {generating ? 'Generating…' : 'Generate'}
              </button>
              <button onClick={() => { setShowGenerate(false); setGenResult(null); }} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// INCIDENT / KNOWLEDGE BASE VIEW (paste incident → AI suggestion → save)
// ============================================================
function IncidentKBView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userName: string }) {
  const [approved, setApproved] = useState<OpRecord[]>([]);
  const [pending, setPending] = useState<OpRecord[]>([]);
  const [rejected, setRejected] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState('');
  const [category, setCategory] = useState<string>('Complaint');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [ask, setAsk] = useState('');
  const [askResult, setAskResult] = useState<{ id: string; title: string; category: string; situation: string; response: string; score: number } | null>(null);
  const [askNotFound, setAskNotFound] = useState(false);
  const [askCopied, setAskCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, p, r] = await Promise.all([
      listKbSuggestionsByStatus(hotelId, 'active'),
      listKbSuggestionsByStatus(hotelId, 'pending'),
      listKbSuggestionsByStatus(hotelId, 'rejected'),
    ]);
    setApproved(a || []);
    setPending(p || []);
    setRejected(r || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hotelId]);

  const generateSuggestion = () => {
    if (!incident) return;
    const result = suggestResponse(incident, category as any);
    setSuggestion(result.response);
  };

  const save = async () => {
    if (!incident || !suggestion) return;
    setSaving(true);
    try {
      // New flow: staff submissions start in 'pending' for admin review
      await createKbSuggestionPending(hotelId, {
        title: category + ' response',
        category,
        situation: incident,
        response: suggestion,
        added_by: userName,
      });
      await load();
      setIncident('');
      setSuggestion('');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string) => {
    await approveKbSuggestion(id);
    await load();
  };

  const reject = async (id: string) => {
    if (!confirm('Reject this entry? It will be moved to Rejected and not appear in search.')) return;
    await rejectKbSuggestion(id);
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this KB entry?')) return;
    await deleteKbSuggestion(id);
    await load();
  };

  const askKb = () => {
    if (!ask.trim()) { setAskResult(null); setAskNotFound(false); return; }
    const q = ask.toLowerCase().trim();
    // Score each approved entry by keyword overlap on situation + response + category
    const scored = approved.map(e => {
      const d = e.details as any;
      const haystack = [d.situation || '', d.response || '', d.category || '', d.title || ''].join(' ').toLowerCase();
      const qWords = q.split(/\s+/).filter(w => w.length > 1);
      let score = 0;
      for (const w of qWords) {
        if (haystack.includes(w)) score += 2;
        // Whole phrase bonus
        if (haystack.includes(q)) score += 3;
      }
      // Exact phrase match big bonus
      if (haystack.includes(q)) score += 5;
      return { id: e.id, title: d.title, category: d.category, situation: d.situation, response: d.response, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      setAskResult(null);
      setAskNotFound(true);
    } else {
      setAskResult(scored[0]);
      setAskNotFound(false);
      setAskCopied(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const categories = [
    { key: 'SOP', label: 'SOP', icon: '📋' },
    { key: 'Best Practice', label: 'Best Practice', icon: '✅' },
    { key: 'GM Guidance', label: 'GM Guidance', icon: '🎯' },
    { key: 'Complaint', label: 'Complaint', icon: '⚠️' },
    { key: 'Service', label: 'Service', icon: '💬' },
    { key: 'Procedures', label: 'Procedures', icon: '⚙️' },
    { key: 'Safety', label: 'Safety', icon: '🚨' },
    { key: 'General', label: 'General', icon: '📌' },
  ];

  const visible = filter === 'all'
    ? [...pending, ...approved, ...rejected]
    : filter === 'pending' ? pending
    : filter === 'rejected' ? rejected
    : approved;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Write Answers</h1>
        <p className="text-[12px] text-gray-500">Knowledge base · best practices · SOPs · GM guidance · what to do in any situation</p>
      </div>

      {/* Ask the KB — chatbot-style search bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
          <Search size={11} /> Search answers
        </label>
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            value={ask}
            onChange={e => { setAsk(e.target.value); if (!e.target.value) { setAskResult(null); setAskNotFound(false); } }}
            onKeyDown={e => { if (e.key === 'Enter') askKb(); }}
            placeholder="Search: check-in, breakfast, noise complaint, late checkout..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100"
          />
          <button onClick={askKb} disabled={!ask.trim()} className="px-4 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            Ask
          </button>
        </div>

        {askResult && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold capitalize">{askResult.category}</span>
              <span className="text-[10px] text-gray-500">{askResult.title}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Situation</p>
            <p className="text-[12px] text-gray-700">{askResult.situation}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Suggested response</p>
            <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{askResult.response}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { navigator.clipboard.writeText(askResult.response); setAskCopied(true); setTimeout(() => setAskCopied(false), 1500); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                <Copy size={11} /> {askCopied ? 'Copied' : 'Copy response'}
              </button>
            </div>
          </div>
        )}

        {askNotFound && ask.trim() && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[12px] text-gray-600">
            No match found for "{ask}". {isAdmin ? 'Check the Pending tab below.' : 'Let your manager know or log a new entry below for admin review.'}
          </div>
        )}
      </div>

      {/* Submit a new entry */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus size={14} className="text-gray-700" />
          <p className="text-[14px] font-bold text-gray-900">Add a new answer</p>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">SOPs, best practices, procedures, and GM guidance. Staff submissions go to <span className="font-semibold">Pending</span> for admin review. Admins can publish directly.</p>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
        <div className="flex flex-wrap gap-1 mt-1 mb-3">
          {categories.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${category === c.key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={category === c.key ? { backgroundColor: TEAL } : {}}>
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Situation / Topic</label>
        <textarea value={incident} onChange={e => setIncident(e.target.value)} rows={3} placeholder="e.g. How to handle a late checkout, breakfast hours, noise complaint procedure..." className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
        <button onClick={generateSuggestion} disabled={!incident} className="mt-3 w-full py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
          ✨ Suggest Response
        </button>
        {suggestion && (
          <>
            <label className="text-[10px] font-bold text-gray-500 uppercase mt-3 block">Suggested response (edit if needed)</label>
            <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)} rows={5} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{saving ? 'Submitting…' : 'Submit for Review'}</button>
              <button onClick={() => { setIncident(''); setSuggestion(''); }} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Clear</button>
            </div>
          </>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {([
          { key: 'approved', label: `✓ Approved (${approved.length})` },
          ...(isAdmin ? [{ key: 'pending', label: `⏳ Pending (${pending.length})` }] : []),
          ...(isAdmin ? [{ key: 'rejected', label: `✗ Rejected (${rejected.length})` }] : []),
          ...(isAdmin ? [{ key: 'all', label: `All (${approved.length + pending.length + rejected.length})` }] : []),
        ] as { key: 'approved' | 'pending' | 'rejected' | 'all'; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${filter === t.key ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`} style={filter === t.key ? { backgroundColor: TEAL } : {}}>{t.label}</button>
        ))}
      </div>

      {/* KB entries */}
      {visible.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">
            {filter === 'pending' ? 'No pending entries' : filter === 'rejected' ? 'No rejected entries' : 'No answers yet'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {filter === 'pending' ? 'New staff submissions will appear here for your review.' : 'Share what you know below to start adding answers.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(e => {
            const d = e.details as any;
            const isPending = e.status === 'pending';
            const isRejected = e.status === 'rejected';
            return (
              <details key={e.id} className={`bg-white rounded-2xl border shadow-sm group ${isPending ? 'border-amber-200' : isRejected ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                <summary className="p-4 cursor-pointer list-none flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold capitalize">{d.category}</span>
                      {isPending && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">⏳ Pending</span>}
                      {isRejected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold">✗ Rejected</span>}
                      <span className="text-[10px] text-gray-400">{e.created_at?.split('T')[0]}</span>
                      <span className="text-[10px] text-gray-400">by {d.added_by}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 line-clamp-2">{d.situation}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={ev => { ev.preventDefault(); del(e.id); }} className="p-1 text-gray-400 hover:text-gray-700 ml-2" title="Delete"><Trash2 size={14} /></button>
                  )}
                </summary>
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-3 mb-1">Suggested response</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{d.response}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => { navigator.clipboard.writeText(d.response); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                      <Copy size={11} /> Copy
                    </button>
                    {isAdmin && isPending && (
                      <>
                        <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => reject(e.id)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {isAdmin && isRejected && (
                      <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── ADMIN CALLOUTS (requests for changes / time off) ─── */
// ADMIN CALLOUTS (requests for changes / time off)
// ============================================================
function AdminCalloutsView({ hotelId }: { hotelId: string }) {
  const [reqs, setReqs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await listScheduleChangeRequests(hotelId, 'pending');
      setReqs(r || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const resolve = async (id: string) => {
    await updateOps(id, { status: 'resolved' });
    setReqs(reqs.filter(r => r.id !== id));
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Staff Callouts</h1>
        <p className="text-[12px] text-gray-500">Requests for time off, swaps, and changes</p>
      </div>
      {reqs.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Inbox size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No pending callouts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reqs.map(r => {
            const d = r.details as any;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{d.requested_by} · {d.change_type?.replace('_', ' ')}</p>
                    <p className="text-[12px] text-gray-500 mt-1">{d.details}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{d.shift_date} · {d.department}</p>
                  </div>
                  <button onClick={() => resolve(r.id)} className="px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>Resolve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline helpers for SVG icons not in lucide
const Phone = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
